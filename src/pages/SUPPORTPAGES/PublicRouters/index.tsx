import HomeLayout from '@/components/layout/HomeLayout';
import { Outlet } from 'react-router-dom';

function PublicRoutes() {
  return (
    <HomeLayout>
      <Outlet />
    </HomeLayout>
  );
}

export default PublicRoutes;
