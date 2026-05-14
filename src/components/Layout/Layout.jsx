import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
