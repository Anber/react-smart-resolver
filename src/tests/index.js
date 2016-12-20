import React from 'react';
import { mount } from 'enzyme';
import { expect } from 'chai';
import sinon from 'sinon';
import createResolver, { $props } from '../resolver';

const { describe, it } = global;

const resolver = createResolver(); // default resolver

const mountComponent = (deps = []) => {
  const component = sinon.stub().returns(null);
  const wrapped = resolver(deps)(component);
  const mounted = mount(React.createElement(wrapped));
  return { mounted, component };
};

describe('resolver', () => {
  it('should map resolve promise', () => {
    const { component } = mountComponent();
    expect(component.callCount).to.be.equal(1, 'render should be called once');
    expect(component.lastCall.args[0].resolve).to.be.instanceof(Promise);
  });

  it('should resolve value', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const resolveFn = sinon.stub().returns(resolveValue);
    const { component } = mountComponent([
      {
        token: 'array',
        resolveFn,
      },
    ]);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(1, 'resolveFn should be called once');
      expect(values.array).to.be.eql(resolveValue);
      done();
    });
  });

  it('shouldn\'t call resolve function twice', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const resolveFn = sinon.stub().returns(resolveValue);
    const { component, mounted } = mountComponent([
      {
        token: 'array',
        resolveFn,
      },
    ]);

    mounted.setProps({ foo: 'bar' });
    expect(component.callCount).to.be.equal(2);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(1, 'resolveFn should be called once');
      expect(values.array).to.be.eql(resolveValue);
      done();
    });
  });

  it('should resolve dependent value', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const dependentValue = [2, 4, 6, 8];
    const resolveFn = sinon.stub().returns(resolveValue);
    const dependentResolveFn = sinon.stub();
    dependentResolveFn.withArgs(resolveValue).returns(dependentValue);
    const { component } = mountComponent([
      {
        token: 'array',
        resolveFn,
      },
      {
        token: 'dependent',
        deps: ['array'],
        resolveFn: dependentResolveFn,
      },
    ]);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(1, 'resolveFn should be called once');
      expect(dependentResolveFn.callCount).to.be.equal(1, 'dependentResolveFn should be called once');
      expect(values.dependent).to.be.eql(dependentValue);
      done();
    });
  });

  it('should recall resolve if props has been changed', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const resolveFn = sinon.stub().returns(resolveValue);
    const { component, mounted } = mountComponent([
      {
        token: 'array',
        deps: [$props],
        resolveFn,
      },
    ]);

    mounted.setProps({ foo: 'bar' });
    expect(component.callCount).to.be.equal(2);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(2, 'resolveFn should be called once');
      expect(values.array).to.be.eql(resolveValue);
      done();
    });
  });

  it('shouldn\'t recall resolve if unspecified property has been changed', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const resolveFn = sinon.stub().returns(resolveValue);
    const { component, mounted } = mountComponent([
      {
        token: 'array',
        deps: [[$props, 'value']],
        resolveFn,
      },
    ]);

    mounted.setProps({ foo: 'bar' });
    expect(component.callCount).to.be.equal(2);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(1, 'resolveFn should be called once');
      expect(values.array).to.be.eql(resolveValue);
      done();
    });
  });

  it('should recall resolve if specified property has been changed', (done) => {
    const resolveValue = [1, 2, 3, 4];
    const resolveFn = sinon.stub().returns(resolveValue);
    const { component, mounted } = mountComponent([
      {
        token: 'array',
        deps: [[$props, 'value']],
        resolveFn,
      },
    ]);

    mounted.setProps({ value: 42 });
    expect(component.callCount).to.be.equal(2);

    const resolve = component.lastCall.args[0].resolve;
    resolve.then((values) => {
      expect(resolveFn.callCount).to.be.equal(2, 'resolveFn should be called once');
      expect(values.array).to.be.eql(resolveValue);
      done();
    });
  });
});
