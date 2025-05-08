/* @refresh reload */
import './index.css';
import { HashRouter, Route } from '@solidjs/router';
import { render } from 'solid-js/web';

import { WidgetConfigs } from './configs/WidgetConfigs';
import { WidgetDropDown } from './configs/WidgetDropDown';

render(
  () => (
    <HashRouter>
      <Route path="/" component={WidgetConfigs} />
      <Route path="/widget/:path" component={WidgetConfigs} />
      <Route path="/dropdown" component={WidgetDropDown} />
    </HashRouter>
  ),
  document.getElementById('root')!,
);
