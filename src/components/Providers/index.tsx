import { Provider } from 'react-redux';

import { ProvidersContext } from '@/contexts';
import { store } from '@/redux/store';

export function Providers({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <ProvidersContext>
      <Provider store={store}>{children}</Provider>
    </ProvidersContext>
  );
}
