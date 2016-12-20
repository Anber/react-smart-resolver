import React from 'react';
import hoistStatics from 'hoist-non-react-statics';
import { createSelector } from 'reselect';
import set from 'lodash.set';
import get from 'lodash.get';

export const $props = Symbol('props');

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function buildSelector(deps = [], resolveFn) {
  const depsFn = deps.map(
    depName => data => (Array.isArray(depName) ? get(data, depName) : data[depName]),
  );

  return createSelector(...depsFn, resolveFn);
}

const noop = () => {};

const defaultOptions = {
  deps: [],
  bindAs: 'resolve',
};

export function resolver(resolves, resolverOptions = {}) {
  const options = {
    ...defaultOptions,
    ...resolverOptions,
  };

  const resolvables = resolves.map(({ token, deps, resolveFn }) => ({
    token,
    deps,
    selector: buildSelector(deps, resolveFn),
  }));

  return (WrappedComponent) => {
    class Resolver extends React.Component {
      state = {
        promise: null,
      };

      componentWillMount() {
        this.load(this.props);
      }

      componentWillReceiveProps(nextProps) {
        this.load(nextProps);
      }

      shouldComponentUpdate(nextState) {
        return nextState.promise !== this.state.promise;
      }

      load(props) {
        const builtinDeps = options.deps.map(dep => ({
          promise: dep.getter(props),
          resolvable: {
            token: dep.token,
          },
        }));

        builtinDeps.push({
          promise: Promise.resolve(props),
          resolvable: {
            token: $props,
          },
        });

        const promises = resolvables
          .map((resolvable) => {
            let resolve = noop;
            let reject = noop;
            const promise = new Promise((resolveFn, rejectFn) => {
              resolve = resolveFn;
              reject = rejectFn;
            });
            return {
              resolvable,
              promise,
              resolve,
              reject,
            };
          })
          .map(({ resolvable, resolve, reject, promise }, _, array) => {
            const deps = resolvable.deps || [];
            const allDeps = [...builtinDeps, ...array];
            const depsPromises = deps.map((dep) => {
              let token;
              let thenFn = value => value;
              if (Array.isArray(dep)) {
                const [name, ...path] = dep;
                token = name;
                if (path.length > 0) {
                  thenFn = value => path.reduce((res, field) => res[field], value);
                }
              } else {
                token = dep;
              }

              return (allDeps.find(i => i.resolvable.token === token) || {}).promise.then(thenFn);
            });

            Promise.all(depsPromises).then((resolvedDeps) => {
              const dataObj = deps.reduce(
                (data, name, idx) => set(data, name, resolvedDeps[idx]),
                {},
              );
              const result = resolvable.selector(dataObj);
              if (result && result.then) {
                result
                  .then(action => resolve((action && action.payload) || action))
                  .catch(error => reject(error));
              } else {
                resolve(result);
              }
            });

            return promise.then(data => ({
              token: resolvable.token,
              data,
            }));
          });

        const promise = Promise.all(promises).then((responses) => {
          return responses.reduce(
            (state, { token, data }) => ({
              ...state,
              [token]: data,
            }),
            {},
          );
        });

        this.setState({
          promise,
        });
      }

      render() {
        const props = {
          ...this.props,
          [options.bindAs]: this.state.promise,
        };

        return (
          <WrappedComponent
            {...props}
          />
        );
      }
    }

    Resolver.displayName = `Resolver(${getDisplayName(WrappedComponent)})`;
    Resolver.WrappedComponent = WrappedComponent;

    return hoistStatics(Resolver, WrappedComponent);
  };
}

export default function createResolver(globalOptions) {
  return (resolves, options) => resolver(resolves, { ...globalOptions, ...options });
}
