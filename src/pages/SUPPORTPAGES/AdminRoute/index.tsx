import RoleRoute from '../RoleRoute';

/** Admin-only pages; other roles are sent to their own landing page */
const AdminRoute = () => <RoleRoute allow={['admin']} />;

export default AdminRoute;
