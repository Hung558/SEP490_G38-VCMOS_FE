import { App as AntdApp } from 'antd';
import 'react-photo-view/dist/react-photo-view.css';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import DefaultAction from './components/layout/DefaultAction/DefaultAction';
import { Providers } from './components/Providers';
import ErrorBoundary from './components/common/Boundary';
import AppRouter from './routerMap/AppRouter';
import GlobalThemeConfig from './theme/GlobalThemeConfig';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '100000000000-dummygoogleclientidforvcmosclinic.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
    </GoogleOAuthProvider>
  );
}

export default App;
