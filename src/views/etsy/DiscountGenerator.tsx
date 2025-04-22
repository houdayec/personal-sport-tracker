import { useRef, useEffect, useState } from "react";
import { Button, Input, InputGroup } from "@/components/ui";
import toast from "@/components/ui/toast";
import Notification from "@/components/ui/Notification";
import { HiOutlineClipboard, HiOutlineCalendar, HiOutlineArrowRight, HiClipboardCopy, HiOutlineClipboardCopy } from "react-icons/hi";
import { showToast } from "@/utils/toastUtils";

const EtsyDiscountGeneratorView = () => {
    const [currentSaleName, setCurrentSaleName] = useState("");
    const [currentSaleDay, setCurrentSaleDay] = useState("");
    const [salesData, setSalesData] = useState<{ date: string; saleName: string }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const saleRefs = useRef<(HTMLLIElement | null)[]>([]);

    useEffect(() => {
        initializeSalesData();
    }, []);

    useEffect(() => {
        const el = saleRefs.current[currentIndex];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [currentIndex]);

    const formatDate = (date: Date) => date.toLocaleDateString("en-US");

    const generateSaleName = (date: Date) => `${date.toISOString().slice(0, 10).replace(/-/g, "")}ISHORTSALE`;

    const initializeSalesData = () => {
        const today = new Date();
        const newSalesData = Array.from({ length: 50 }, (_, i) => {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            return { date: formatDate(futureDate), saleName: generateSaleName(futureDate) };
        });

        setSalesData(newSalesData);
        setCurrentSaleName(newSalesData[0].saleName);
        setCurrentSaleDay(newSalesData[0].date);
        setCurrentIndex(0);
    };

    const getNextSale = () => {
        const nextIndex = (currentIndex + 1) % salesData.length;
        setCurrentSaleName(salesData[nextIndex].saleName);
        setCurrentSaleDay(salesData[nextIndex].date);
        setCurrentIndex(nextIndex);
    };

    const copyToClipboard = (title: string, text: string) => {
        navigator.clipboard.writeText(text);
        showToast({
            type: 'success',
            message: `${title}`
        })
    };

    return (
        <div className="bg-white p-4">
            <h1 className="text-2xl font-bold mb-2">Etsy Discount Generator</h1>
            <h3 className="text-lg font-semibold mb-4">Discount details</h3>

            {/* Responsive Input Groups */}
            <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-1 mb-4">
                <InputGroup>
                    <Input
                        type="text"
                        value={currentSaleDay}
                        readOnly
                        className="border border-gray-300"
                    />
                    <Button
                        icon={<HiOutlineClipboardCopy />}
                        onClick={() => copyToClipboard("Date copiée", currentSaleDay)}
                    />
                </InputGroup>
                <InputGroup>
                    <Input
                        type="text"
                        value={currentSaleName}
                        readOnly
                        className="border border-gray-300"
                    />
                    <Button
                        icon={<HiOutlineClipboardCopy />}
                        onClick={() => copyToClipboard("Code copié", currentSaleName)}
                    />
                </InputGroup>
            </div>

            <div className="flex justify-start mt-4">
                <Button
                    variant="twoTone"
                    className="w-full md:w-48 gap-2"
                    onClick={getNextSale}
                    icon={<HiOutlineArrowRight />}
                >
                    Prochaine promotion
                </Button>
            </div>

            <div className="grid mt-6 md:grid-cols-2 sm:grid-cols-1">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Upcoming Sales</h3>
                    <ul className="mt-2 space-y-1 border rounded-lg p-3 max-h-72 overflow-y-auto">
                        {salesData.map((sale, index) => (
                            <li
                                key={index}
                                ref={(el) => {
                                    saleRefs.current[index] = el;
                                }}
                                className={`flex justify-between text-sm p-2 rounded-md 
                                ${index === currentIndex ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"}`}
                            >
                                <span className="text-blue-900">{sale.date}</span>
                                <span className="text-blue-900">{sale.saleName}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
};

export default EtsyDiscountGeneratorView;
