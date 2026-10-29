import { App as AntdApp } from 'antd';
import 'react-photo-view/dist/react-photo-view.css';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import DefaultAction from './components/layout/DefaultAction/DefaultAction';
import { Providers } from './components/Providers';
import ErrorBoundary from './components/common/Boundary';
import AppRouter from './routerMap/AppRouter';
import GlobalThemeConfig from './theme/GlobalThemeConfig';

function App() {
  return (
    <Providers>
      <GlobalThemeConfig>
        <AntdApp>
          <BrowserRouter>
            <ErrorBoundary>
              <div className="layout-center">
                <div className="layout-max-width">
                  <DefaultAction />
                  <AppRouter />
                </div>
              </div>
              <Toaster
                toastOptions={{
                  classNames: {
                    toast: 'my-toast',
                    success: 'my-toast-success',
                    error: 'my-toast-error',
                    warning: 'my-toast-warning',
                  },
                }}
              />
            </ErrorBoundary>
          </BrowserRouter>
        </AntdApp>
      </GlobalThemeConfig>
    </Providers>
  );
}

export default App;
