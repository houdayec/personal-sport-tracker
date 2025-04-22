import type { JSX } from 'react'
import {
    HiOutlineHome,
    HiOutlineGlobeAlt,
    HiOutlineShoppingCart,
    HiOutlineTag,
    HiOutlineClipboardList,
    HiOutlineShoppingBag,
    HiOutlineCog,
    HiOutlineChartBar,
} from "react-icons/hi";
import { FaShopify, FaTools } from "react-icons/fa"; // Adding icons from FontAwesome
import { SiEtsy, SiFirebase, SiGoogledrive, SiOpenai, SiWoo, SiWordpress } from 'react-icons/si';

export type NavigationIcons = Record<string, JSX.Element>


const navigationIcon: NavigationIcons = {
    home: <HiOutlineHome />,               // Home Page
    stats: <HiOutlineChartBar />,               // Home Page
    website: <HiOutlineGlobeAlt />,        // Website (Globe Icon)
    etsy: <HiOutlineShoppingBag />,                   // Etsy (Shopify Icon as Etsy alternative)
    products: <HiOutlineClipboardList />,  // Products (Clipboard List for better representation)
    tools: <HiOutlineCog />,                    // Tools (More relevant than cog)
};
// const navigationIcon: NavigationIcons = {
//     home: <span className="text-gray-700"><HiOutlineHome /></span>,
//     stats: <span className="text-emerald-500"><HiOutlineChartBar /></span>,
//     website: <span className="text-blue-600"><HiOutlineGlobeAlt /></span>,
//     etsy: <span className="text-orange-500"><SiEtsy /></span>,
//     products: <span className="text-indigo-500"><HiOutlineClipboardList /></span>,
//     tools: <span className="text-teal-600"><HiOutlineCog /></span>,

//     firebase: <span className="text-yellow-500"><SiFirebase /></span>,
//     wordpress: <span className="text-blue-700"><SiWordpress /></span>,
//     woocommerce: <span className="text-purple-500"><SiWoo /></span>,
//     gdrive: <span className="text-green-500"><SiGoogledrive /></span>,
//     chatgpt: <span className="text-emerald-600"><SiOpenai /></span>,
// }
export default navigationIcon;
