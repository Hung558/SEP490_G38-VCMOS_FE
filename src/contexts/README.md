Ví dụ cách dùng:

'use client';
import { useRouterContext } from '@/contexts/useRouterContext';

const Page = () => {
const { routerBefore, setRouterBefore } = useRouterContext();

return <div>Before: {routerBefore}</div>;
};
