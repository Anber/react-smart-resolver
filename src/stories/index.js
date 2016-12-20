import React from 'react';
import { storiesOf, action } from '@kadira/storybook';
import createResolver from '../index';

const Component = props => (<div>{JSON.stringify(props)}</div>);

const loadingAction = action('component is loading');
const Loading = () => {
  loadingAction();
  return <div>Loading</div>;
};

const resolver = createResolver({ spinner: <Loading /> });

const resolveAction = action('array resolve has been called');

storiesOf('resolver', module)
  .add('default view', () => {
    const Wrapped = resolver([
      {
        token: 'array',
        resolveFn: () => resolveAction('array') || [1, 2, 3, 4],
      },
    ])(Component);
    return <Wrapped />;
  });
