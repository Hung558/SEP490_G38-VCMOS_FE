import { AuthProvider } from './routerProvider/authContext';
import { CollapseMenuProvider } from './routerProvider/collapseMenuContext';
import { IsLoginProvider } from './routerProvider/isLoginContext';
import { RouterProvider } from './routerProvider/routerContext';
import { ThemeProvider } from './routerProvider/themeContext';

export function ProvidersContext({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RouterProvider>
        <IsLoginProvider>
          <ThemeProvider>
            <CollapseMenuProvider>{children}</CollapseMenuProvider>
          </ThemeProvider>
        </IsLoginProvider>
      </RouterProvider>
    </AuthProvider>
  );
}
