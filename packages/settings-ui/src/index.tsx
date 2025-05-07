/* @refresh reload */
import './index.css';
import { HashRouter, Route } from '@solidjs/router';
import { render } from 'solid-js/web';

import { WidgetConfigs } from './configs/WidgetConfigs';
import { DropDown } from './configs/DropDown';

render(
  () => (
    <HashRouter>
      <Route path="/" component={WidgetConfigs} />
      <Route path="/widget/:path" component={WidgetConfigs} />
      <Route path="/dropdown" component={DropDown} />
    </HashRouter>
  ),
  document.getElementById('root')!,
);
