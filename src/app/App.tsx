import { RouterProvider } from 'react-router';
import { router } from './routes';

/**
 * App root — renders the router.
 * Auth0Provider is applied one level up in main.tsx.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
