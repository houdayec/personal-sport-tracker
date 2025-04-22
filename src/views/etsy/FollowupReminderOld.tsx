import React, { useState } from "react";

interface Order {
    customerName: string;
    orderId: string;
    orderDate: string;
}

const FollowupReminder: React.FC = () => {
    const [etsyHtml, setEtsyHtml] = useState<string>("");
    const [orders, setOrders] = useState<Order[]>([]);
    const [popupVisible, setPopupVisible] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(5); // Etsy pagination
    const [showProxyPopup, setShowProxyPopup] = useState<boolean>(false);
    const [ipData, setIpData] = useState<{ country: string; flag: string; ip: string } | null>(null);
    const [loadingIp, setLoadingIp] = useState<boolean>(false);
    const [errorIp, setErrorIp] = useState<boolean>(false);
    const [selectedMessages, setSelectedMessages] = useState<Record<string, string>>({});

    // Message templates with proper type definition
    const messageTemplates: Record<string, string> = {
        default: "Default Message",
        oneStar: "1-Star Review Follow-up",
        fiveStar: "5-Star Thank You",
        repeatCustomer: "Repeat Customer Appreciation",
    };

    const fetchIpData = async () => {
        setShowProxyPopup(true);
        setLoadingIp(true);
        setErrorIp(false);

        try {
            const response = await fetch("https://ipapi.co/json/");
            const data = await response.json();
            setIpData({
                country: data.country_name,
                flag: `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`,
                ip: data.ip,
            });
        } catch (error) {
            console.error("Failed to fetch IP data:", error);
            setErrorIp(true);
        } finally {
            setLoadingIp(false);
        }
    };

    const getMessageTemplates = (order: Order): Record<string, string> => ({
        default:
            `Hi ${order.customerName} 👋\n\n` +
            `I just wanted to check in and make sure your order met your expectations. ` +
            `I truly appreciate you choosing FontMaze on Etsy, and I hope you're ` +
            `100% satisfied with your purchase! Please don’t hesitate to message me ` +
            `here if you need any help.\n\n` +
            `I’d be incredibly grateful if you took a moment to leave us some feedback—it helps us grow! ` +
            `Click on the link below:\n👉 https://www.etsy.com/your/purchases/${order.orderId}\n\n` +
            `Thank you so much in advance for taking the time to share your experience ` +
            `and for being a valued customer.\n\n` +
            `Have a wonderful day!\n` +
            `- Melissa`,

        oneStar:
            `Hi ${order.customerName},\n\n` +
            `I'm really sorry to hear that your order didn’t meet your expectations. ` +
            `Your satisfaction is my top priority, and I’d love the opportunity to make things right.\n\n` +
            `Please send me a message so I can assist you—we’ll work together until you're 100% happy!\n\n` +
            `Best,\nMelissa`,

        fiveStar:
            `Hi ${order.customerName} 😊\n\n` +
            `Thank you so much for your 5-star review! ⭐⭐⭐⭐⭐\n` +
            `I’m thrilled that you’re enjoying your purchase. As a small token of appreciation, ` +
            `here’s a 60% off coupon for your next order: **GRATEFUL60** 🎉\n\n` +
            `Hope to see you again soon! Feel free to reach out anytime.\n\n` +
            `Thanks again for your support!\n- Melissa`,

        repeatCustomer:
            `Hi ${order.customerName} 😊\n\n` +
            `It’s wonderful to see you back at FontMaze! We truly appreciate your continued support 😊\n\n` +
            `As a thank you, here’s a special 60% off discount for your next order: **GRATEFUL60**\n\n` +
            `If you have a moment, we’d love to hear your feedback! Click here: \n👉 https://www.etsy.com/your/purchases/${order.orderId}\n\n` +
            `And of course, if you ever need help or have any questions, feel free to reach out—I’m always happy to assist.\n\n` +
            `Looking forward to seeing what you create next!\n\n` +
            `Have a great day!\n- Melissa`
    });


    const getMessageTemplates2 = (order: Order) => ({
        default: `
      Hi ${order.customerName} 👋
      
      I just wanted to reach out to make sure that your order met your expectations. I truly appreciate you choosing FontMaze here on Etsy and I hope you are 100% satisfied with your new purchase! Please don’t hesitate to message me here if you weren’t or if you need help.
      
      I would be incredibly grateful if you took the time to leave us some feedback, it helps us to grow!
      Click on the link 👉 https://www.etsy.com/your/purchases/${order.orderId}
      
      Thank you so much in advance for taking the time to share your experience and for being a customer.
      
      Have a great day!
      - Melissa
      `.trim(),

        oneStar: `
      Hi ${order.customerName},  
      
      I'm really sorry to hear that your order didn’t meet your expectations. Your satisfaction is my top priority, and I’d love the opportunity to make things right.  
      
      Please send me a message so I can assist you—we’ll work together until you’re 100% happy with your purchase!  
      
      Looking forward to resolving this for you.  
      
      Best,  
      Melissa  
      `.trim(),

        fiveStar: `
      Hi ${order.customerName} 😊  
      
      Thank you so much for your 5-star review! ⭐️⭐️⭐️⭐️⭐️  
      I’m so happy to hear that you’re enjoying your purchase. As a small token of appreciation, here’s a 60% off coupon for your next order: GRATEFUL60 🎉  
      
      Hope to see you again soon! Feel free to reach out anytime.  
      
      Thanks again for your support!  
      - Melissa  
      `.trim(),

        repeatCustomer: `
      Hi ${order.customerName} 👋  
      
      It’s so great to see you back at FontMaze! We truly appreciate your continued support 😊  
      
      As a thank you, here’s a special discount code for 60% off your next order: GRATEFUL60
      
      If you have a moment, we’d love to hear your feedback! You can leave a review here: https://www.etsy.com/your/purchases/${order.orderId}  
      
      And of course, if you ever need help or have any questions, feel free to reach out—I’m always happy to assist.  
      
      Looking forward to seeing what you create next!  
      
      Have a great day!  
      - Melissa  
      `.trim(),
    });

    // Extract order data from Etsy HTML
    const extractOrderData = (html: string): Order[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const orderElements = doc.querySelectorAll(".panel-body .panel-body-row");

        const ordersData: Order[] = [];

        orderElements.forEach((order) => {
            const customerNameElement = order.querySelector(".dropdown-group button");
            const orderIdElement = order.querySelector('a[href*="order_id"]');
            const dateElements = order.querySelectorAll(".text-body-smaller");

            let customerName = customerNameElement?.textContent?.trim().replace(/\s+/g, " ").split(" ")[0] || "";
            let orderId = orderIdElement?.textContent?.trim().replace("#", "") || "";
            let orderDate = "";

            dateElements.forEach((el) => {
                if (el.textContent?.includes("Ordered")) {
                    const dateText = el.textContent.replace("Ordered", "").trim();
                    orderDate = new Date(dateText + " UTC").toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    });
                }
            });

            if (customerName && orderId && orderDate) {
                ordersData.push({ customerName, orderId, orderDate });
            }
        });

        return ordersData;
    };

    // Handle message generation
    const generateMessages = () => {
        if (!etsyHtml.trim()) {
            alert("Please paste the Etsy HTML code!");
            return;
        }

        const extractedOrders = extractOrderData(etsyHtml);
        if (extractedOrders.length === 0) {
            alert("No valid orders found in the provided HTML!");
            return;
        }

        setOrders(extractedOrders);
    };

    // Group orders by date
    const groupOrdersByDate = () => {
        return orders.reduce((acc: Record<string, Order[]>, order) => {
            if (!acc[order.orderDate]) {
                acc[order.orderDate] = [];
            }
            acc[order.orderDate].push(order);
            return acc;
        }, {});
    };

    const ordersByDate = groupOrdersByDate();

    return (
        <div className="bg-white">
            <h1 className="text-2xl font-bold text-gray-800">Followup Reminder</h1>
            <p className="text-gray-600 my-3">
                Collez le code HTML de votre commande Etsy ci-dessous et cliquez sur "Générer les messages" pour créer automatiquement des messages pour vos commandes. Les messages s'afficheront ci-dessous.
            </p>

            {/* Go to Etsy Orders button */}
            <button
                className="bg-orange-500 text-white px-4 py-2 rounded-md mb-3 hover:bg-orange-600"
                onClick={fetchIpData}
            >
                Open Etsy Orders
            </button>

            {/* Etsy HTML Input */}
            <textarea
                className="w-full p-3 border rounded-md"
                rows={6}
                placeholder="Paste Etsy order HTML here..."
                value={etsyHtml}
                onChange={(e) => setEtsyHtml(e.target.value)}
            />

            {/* Generate Messages Button */}
            <button
                className="mt-3 bg-blue-600 text-white py-2 px-5 rounded-md hover:bg-blue-700"
                onClick={generateMessages}
            >
                Extract Orders
            </button>

            {/* Orders grouped by date */}
            {Object.keys(ordersByDate).length > 0 && (
                <div className="mt-4">
                    {Object.entries(ordersByDate).map(([date, orders]) => (
                        <div key={date} className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-700 mb-1">{date} - {orders.length} orders</h2>
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-gray-300 p-2">Order ID</th>
                                        <th className="border border-gray-300 p-2">Customer</th>
                                        <th className="border border-gray-300 p-2">Message</th>
                                        <th className="border border-gray-300 p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border border-gray-300 p-2">{order.orderId}</td>
                                            <td className="border border-gray-300 p-2">{order.customerName}</td>
                                            <td className="border border-gray-300 p-2">
                                                <select
                                                    className="border rounded-md p-1"
                                                    value={selectedMessages[order.orderId] || "default"} // Store key, not message text
                                                    onChange={(e) => {
                                                        setSelectedMessages((prev) => ({
                                                            ...prev,
                                                            [order.orderId]: e.target.value, // Store key
                                                        }));
                                                    }}
                                                >
                                                    {Object.keys(messageTemplates).map((key) => (
                                                        <option key={key} value={key}>{messageTemplates[key]}</option> // Display readable names
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="border border-gray-300 p-2">
                                                <a
                                                    href={`https://www.etsy.com/your/orders/sold/new?search_query=${encodeURIComponent(order.orderId)}
        &order_id=${encodeURIComponent(order.orderId)}
        &state=alura-customer-followups
        &message=${encodeURIComponent(
                                                        getMessageTemplates(order)[selectedMessages[order.orderId] || "default"]
                                                            .replace(/\n/g, '%0A') // Ensure newlines are encoded properly
                                                            .replace(/ /g, '%20')  // Ensure spaces are properly encoded
                                                    )}`}
                                                    onClick={(e) => {
                                                        e.preventDefault(); // Prevents default navigation until copy is complete

                                                        const messageToCopy = getMessageTemplates(order)[selectedMessages[order.orderId] || "default"];
                                                        console.log(messageToCopy)
                                                        // Ensure e.target is an anchor element
                                                        const link = e.currentTarget as HTMLAnchorElement;

                                                        // Copy message to clipboard
                                                        navigator.clipboard.writeText(messageToCopy)
                                                            .then(() => {
                                                                console.log("Message copied to clipboard!");

                                                                // Open Etsy link after copying successfully
                                                                window.open(link.href, "_blank");
                                                            })
                                                            .catch(err => console.error("Failed to copy message:", err));
                                                    }}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-900 text-white px-3 py-1 rounded-md hover:bg-green-600"
                                                >
                                                    Contact
                                                </a>



                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* Check if there are exactly 50 orders, meaning more might exist */}
            {orders.length === 50 && (
                <div className="text-center mt-4">
                    <button
                        className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
                        onClick={() => {
                            window.open(`https://www.etsy.com/your/orders/sold/completed?ref=seller-platform-mcnav&page=${currentPage - 1}`, "_blank"); // Open previous orders page
                            setCurrentPage((prev) => Math.max(prev - 1, 1)); // Decrease page but ensure it doesn't go below 1
                        }}
                    >
                        Ouvrir la page Etsy {currentPage}
                    </button>
                </div>
            )}


            {/* Proxy Check Popup */}
            {showProxyPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="bg-white p-5 rounded-lg shadow-lg text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Proxy Check</h2>
                        {loadingIp ? (
                            <p>Loading IP details...</p>
                        ) : errorIp ? (
                            <p className="text-red-500">Failed to load IP. Proceed with caution.</p>
                        ) : (
                            ipData && (
                                <>
                                    <img src={ipData.flag} alt="Country Flag" className="w-10 h-6 mx-auto mb-2" />
                                    <p><b>IP:</b> {ipData.ip}</p>
                                    <p><b>Country:</b> {ipData.country}</p>
                                </>
                            )
                        )}

                        {/* Buttons: Cancel + Open Etsy Orders */}
                        <div className="flex justify-center gap-4 mt-3">
                            <button
                                className="bg-red-500 text-white px-4 py-2 rounded-md"
                                onClick={() => setShowProxyPopup(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                onClick={() => {
                                    window.open(`https://www.etsy.com/your/orders/sold/completed?page=${currentPage}`, "_blank"); // Open Etsy Orders page
                                    setShowProxyPopup(false); // Close popup
                                }}
                            >
                                Go to Etsy Orders
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FollowupReminder;
