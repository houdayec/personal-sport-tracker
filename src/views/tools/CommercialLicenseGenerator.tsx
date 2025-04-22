import React, { useEffect, useState } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import * as Yup from "yup";
import { Button, Input, Select, DatePicker } from "@/components/ui";
import Radio from "@/components/ui/Radio";
import toast from "@/components/ui/toast";
import Notification from "@/components/ui/Notification";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { embroideryFontPdfBase64, fontPdfBase64 } from "@/constants/licensesData.constant";
import { useSearchParams } from "react-router-dom";
import { Resend } from 'resend';
import LicenseEmail from "./emails/LicenseEmail";
import { fonts, embroideryFonts, Font, EmbroideryFont } from "../../../public/data/products"; // Import font data
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { HiOutlineDocumentDuplicate, HiOutlineMail } from "react-icons/hi";

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

// Define select option type
type SelectOption = { label: string; value: string };

// **Formik Validation Schema**
const LicenseSchema = Yup.object().shape({
    licenseType: Yup.string().required("License type is required"),
    selectedProduct: Yup.object().required("Please select a product"),
    issueDate: Yup.date().required("Date of Issue is required"),
    ownerName: Yup.string().required("Owner's name is required"),
});

type LicenseFormValues = {
    licenseType: string;
    selectedProduct: Font | EmbroideryFont | null;
    issueDate: Date;
    ownerName: string;
};

const CommercialLicenseGenerator: React.FC = () => {
    // Product options
    const [fontOptions, setFontOptions] = useState<SelectOption[]>([]);
    const [embroideryFontOptions, setEmbroideryFontOptions] = useState<SelectOption[]>([]);

    useEffect(() => {
        // Convert product data into SelectOption format
        setFontOptions(fonts.map((font: Font) => ({
            label: `${font.sku} - ${font.name}`, // Display SKU & Name
            value: font.sku                      // Use SKU for value
        })));

        setEmbroideryFontOptions(embroideryFonts.map((embroideryFont: EmbroideryFont) => ({
            label: `${embroideryFont.sku} - ${embroideryFont.name}`,
            value: embroideryFont.sku
        })));
    }, []);

    const [searchParams] = useSearchParams();

    // Extract URL parameters
    const orderId = searchParams.get("orderId");
    const licenseSku = searchParams.get("licenseSku");
    const dateOfIssue = searchParams.get("dateOfIssue") || new Date().toISOString().split("T")[0]; // Default to today
    const ownerEmail = searchParams.get("ownerEmail") || "";

    // Determine the license type based on SKU
    const licenseType = licenseSku?.startsWith("CL001") ? "Font" : "Embroidery Font";

    // Get product list based on license type
    const productList = licenseType === "Font" ? fonts : embroideryFonts;

    // Find the selected product by SKU
    const selectedProduct = productList.find(product => product.sku.startsWith(licenseSku || "")) || null;
    console.log("data", licenseSku, dateOfIssue, ownerEmail, licenseType)

    const parsedDate = dateOfIssue ? new Date(dateOfIssue) : new Date();

    // Generate Unique License ID
    const generateLicenseId = (licenseType: string): string => {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
        return licenseType === "Font" ? `FTL${datePart}${randomPart}` : `EFTL${datePart}${randomPart}`;
    };

    // Function to Convert Base64 to ArrayBuffer
    const base64ToArrayBuffer = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);

    // Fill and Generate PDF
    const generatePdf = async (values: any) => {
        try {
            const licenseId = generateLicenseId(values.licenseType);
            const selectedPdfBase64 = values.licenseType === "Font" ? fontPdfBase64 : embroideryFontPdfBase64;
            const templatePdfBytes = base64ToArrayBuffer(selectedPdfBase64);

            const pdfDoc = await PDFDocument.load(templatePdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            // Embed Standard Fonts
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Extract SKU and Font Name
            const sku = values.selectedProduct.sku;
            const fontName = values.selectedProduct.name;
            const productLabel = `${sku} - ${fontName} ${values.licenseType}`;

            // Define text attributes
            const textMargin = 40;
            const fontSize = 20;
            const startY = 170;
            const lineSpacing = 30;

            // Add text to PDF
            firstPage.drawText("LICENSE ID:", { x: textMargin, y: height - startY, size: fontSize, font: boldFont, color: rgb(0, 0, 0) });
            firstPage.drawText(licenseId, { x: textMargin + 127, y: height - startY, size: fontSize, font: regularFont, color: rgb(0, 0, 0) });

            firstPage.drawText("PRODUCT:", { x: textMargin, y: height - startY - lineSpacing, size: fontSize, font: boldFont, color: rgb(0, 0, 0) });
            firstPage.drawText(productLabel, { x: textMargin + 115, y: height - startY - lineSpacing, size: fontSize, font: regularFont, color: rgb(0, 0, 0) });

            firstPage.drawText("DATE OF ISSUE:", { x: textMargin, y: height - startY - 2 * lineSpacing, size: fontSize, font: boldFont, color: rgb(0, 0, 0) });
            const formattedDate = new Date(values.issueDate).toLocaleDateString("en-GB", {
                weekday: "long", // Full day name (e.g., Thursday)
                day: "numeric",  // Day of the month (e.g., 13)
                month: "long",   // Full month name (e.g., March)
                year: "numeric"  // Full year (e.g., 2025)
            });

            firstPage.drawText(formattedDate, { x: textMargin + 170, y: height - startY - 2 * lineSpacing, size: fontSize, font: regularFont, color: rgb(0, 0, 0) });

            firstPage.drawText("OWNER:", { x: textMargin, y: height - startY - 3 * lineSpacing, size: fontSize, font: boldFont, color: rgb(0, 0, 0) });
            firstPage.drawText(values.ownerName, { x: textMargin + 92, y: height - startY - 3 * lineSpacing, size: fontSize, font: regularFont, color: rgb(0, 0, 0) });

            // Save PDF
            const pdfBytes = await pdfDoc.save();
            const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            setGeneratedPdf(pdfBlob);

            // ✅ Upload PDF to Firebase
            const storage = getStorage();
            const storageRef = ref(storage, `commercial_licenses/${values.licenseType}/${sku}_${fontName}_${values.licenseType}_License_${licenseId}.pdf`);

            await uploadBytes(storageRef, pdfBlob);
            console.log("✅ PDF uploaded to Firebase Storage");

            const url = URL.createObjectURL(pdfBlob);

            // Download PDF
            const link = document.createElement("a");
            link.href = url;
            link.download = `${sku}_${fontName}_${values.licenseType}_License_${licenseId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.push(<Notification type="success" title="PDF Generated Successfully!" />, { placement: "bottom-start" });

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.push(<Notification type="danger" title="Failed to generate PDF." />, { placement: "bottom-start" });
        }
    };

    const sendLicenseEmailMailto = (recipient: string, customerName: string, productName: string, licenseType: string) => {
        // Remove SKU (assumes SKU is always the first word)
        //const cleanedProductName = productName.split(" ").slice(1).join(" ");

        // Format product name with license type
        const formattedProductName = `${productName} ${licenseType}`;

        const subject = encodeURIComponent(`Your Commercial License for ${formattedProductName}`);

        const body = encodeURIComponent(
            `Hello,\n\n` +
            `Thank you so much for choosing our ${formattedProductName} for your creative projects! We truly appreciate your support.\n\n` +
            `Attached to this email, you’ll find your commercial license in PDF format. It includes all the details and terms of the agreement for your reference.\n\n` +
            `If you have any questions or need any help, feel free to reach out—we’re always happy to assist!\n\n` +
            `Wishing you lots of success with your projects, and we can’t wait to see what you create with our **${licenseType}**.\n\n` +
            `Have a wonderful day!\n\n` +
            `Best regards,\n\n` +
            `Melissa`
        );

        // Open user's default email client with pre-filled details
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    };


    const sendLicenseEmail = async (pdfBlob: Blob, recipientEmail: string, productName: string) => {
        const formData = new FormData();
        //formData.append("file", pdfFile);
        formData.append("to", recipientEmail);
        formData.append("from", "contact@font-station.com");
        formData.append("subject", `Your Commercial License for ${productName}`);
        formData.append("body", `Dear Customer,\n\nAttached is your commercial license for ${productName}.\n\nThank you for your purchase!\n\nBest Regards,\nFont Station`);

        try {

            const emailData = await resend.emails.send({
                from: "contact@font-station.com",
                to: 'houdayer.corentin@gmail.com',
                subject: `Your Commercial License for ${productName}`,
                react: <LicenseEmail productName={productName} licenseUrl={"licenseUrl"} />,
            });

            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob); // Convert Blob to Base64
            reader.onloadend = async () => {
                const base64String = reader.result?.toString().split(",")[1]; // Extract Base64 without prefix

                if (!base64String) {
                    toast.push(<Notification type="danger" title="Error processing PDF file!" />, { placement: "bottom-start" });
                    return;
                }

                const response = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${resend}`, // ⚠️ Secure this in a backend
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "contact@font-station.com",
                        to: 'houdayer.corentin@gmail.com',
                        subject: `Your Commercial License for ${productName}`,
                        html: `<h1>🎉 Your Commercial License</h1><p>Dear customer,</p>
                           <p>Please find attached your commercial license for <strong>${productName}</strong>.</p>
                           <p>Thank you for your purchase!</p>`,
                        attachments: [
                            {
                                filename: `${productName}_License.pdf`,
                                content: base64String,
                                contentType: "application/pdf",
                            },
                        ],
                    }),
                });

                const result = await response.json();

                if (response.ok) {
                    toast.push(<Notification type="success" title="License sent successfully!" />, { placement: "bottom-start" });
                } else {
                    console.error("❌ Email sending failed:", result);
                    toast.push(<Notification type="danger" title="Failed to send email!" />, { placement: "bottom-start" });
                }
            };
        } catch (error: unknown) {
            console.error("❌ Email sending failed:", error);

            if (error instanceof Error) {
                console.error("🔹 Error Message:", error.message);
            }

            if (typeof error === "object" && error !== null) {
                const err = error as { response?: any; request?: any; message?: string };

                if (err.response) {
                    console.error("🔹 Response Data:", err.response.data);
                    console.error("🔹 Status Code:", err.response.status);
                    console.error("🔹 Headers:", err.response.headers);
                } else if (err.request) {
                    console.error("🔹 No response received from API:", err.request);
                } else {
                    console.error("🔹 Unknown Request Error:", err.message || "No additional details");
                }
            }

            toast.push(
                <Notification type="danger" title="Failed to send email!" />,
                { placement: "bottom-start" }
            );
        }

    };

    const copyDeliveryMessage = (values: LicenseFormValues) => {
        const productName = values.selectedProduct?.name || "our product";
        const message =
            `Hi,\n\n` +
            `Thanks for your license purchase for our ${productName} ${values.licenseType}.\n\n` +
            `We invite you to read the attached license. It's short, clear, and made to help you understand how you can use the product.\n\n` +
            `If you have any questions, we're always happy to help!\n\n` +
            `Wishing you lots of success with your creative projects.\n\n` +
            `- Melissa from FontMaze`;

        navigator.clipboard.writeText(message)
            .then(() => {
                toast.push(<Notification type="success" title="Welcome message copied!" />, { placement: "bottom-start" });
            })
            .catch(() => {
                toast.push(<Notification type="danger" title="Failed to copy message." />, { placement: "bottom-start" });
            });
    };

    return (
        <div className="w-full lg:w-2/3">
            <Formik<LicenseFormValues>
                initialValues={{
                    licenseType,
                    selectedProduct: selectedProduct || null,
                    issueDate: parsedDate,
                    ownerName: ownerEmail,
                }}
                enableReinitialize={true}
                validationSchema={LicenseSchema}
                onSubmit={(values) => {
                    generatePdf(values)
                }}
            >
                {({ values, setFieldValue }) => {
                    useEffect(() => {
                        if (licenseSku) {
                            const product = (values.licenseType === "Font" ? fonts : embroideryFonts)
                                .find(p => p.sku.startsWith(licenseSku)) || null;
                            setFieldValue("selectedProduct", product);
                        }
                    }, [licenseSku, values.licenseType, setFieldValue]);

                    return (<Form className="bg-white">
                        <h1 className="text-2xl font-bold mb-4">Commercial License Generator</h1>

                        {/* License Type */}
                        <h3 className="text-lg font-semibold mb-2">License Type</h3>
                        <Radio.Group
                            value={values.licenseType}
                            onChange={(val) => setFieldValue("licenseType", val)}
                            className="flex space-x-4 mb-4"
                        >
                            <Radio value="Font">Font</Radio>
                            <Radio value="Embroidery Font">Embroidery Font</Radio>
                        </Radio.Group>

                        {/* Search Product + Product Dropdown in one row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Search Product</h3>
                                <Field name="searchQuery">
                                    {({ field }: { field: any }) => (
                                        <Input
                                            {...field}
                                            type="text"
                                            placeholder="Type to search..."
                                            onChange={(e) => {
                                                setFieldValue("searchQuery", e.target.value);

                                                // Filter product list dynamically
                                                const filtered = (values.licenseType === "Font" ? fontOptions : embroideryFontOptions)
                                                    .filter(product => product.label.toLowerCase().includes(e.target.value.toLowerCase()));

                                                setFieldValue("filteredProducts", filtered);

                                                if (filtered.length > 0) {
                                                    const selectedSku = filtered[0].value;
                                                    const productList = values.licenseType === "Font" ? fonts : embroideryFonts;

                                                    const foundProduct = productList.find(p => p.sku === selectedSku);
                                                    setFieldValue("selectedProduct", foundProduct ?? null);
                                                } else {
                                                    setFieldValue("selectedProduct", null);
                                                }
                                            }}
                                        />
                                    )}
                                </Field>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Product</h3>
                                <Field name="selectedProduct">
                                    {({ field, form }: { field: any; form: any }) => (
                                        <div>
                                            <Select
                                                {...field}
                                                options={values.licenseType === "Font" ? fontOptions : embroideryFontOptions}
                                                placeholder="Select Product"
                                                isClearable
                                                isSearchable
                                                value={(values.licenseType === "Font" ? fontOptions : embroideryFontOptions)
                                                    .find(opt => opt.value === values.selectedProduct?.sku)}
                                                onChange={(option) => {
                                                    if (!option) {
                                                        form.setFieldValue("selectedProduct", null);
                                                        return;
                                                    }

                                                    const productList = values.licenseType === "Font" ? fonts : embroideryFonts;
                                                    const selectedProduct = productList.find(p => p.sku === option.value);

                                                    form.setFieldValue("selectedProduct", selectedProduct ?? null);
                                                }}
                                            />
                                            {form.errors.selectedProduct && form.touched.selectedProduct && (
                                                <span className="text-red-500 text-sm">{form.errors.selectedProduct}</span>
                                            )}
                                        </div>
                                    )}
                                </Field>

                            </div>
                        </div>

                        {/* Date of Issue + Owner Name in one row */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Date of Issue</h3>
                                <Field name="issueDate">
                                    {({ field, form }: { field: any; form: any }) => (
                                        <div>
                                            <DatePicker
                                                {...field}
                                                placeholder="Select Date"
                                                value={field.value || new Date()}
                                                onChange={(date) => form.setFieldValue("issueDate", date)}
                                            />
                                            {form.errors.issueDate && form.touched.issueDate && (
                                                <span className="text-red-500 text-sm">{form.errors.issueDate}</span>
                                            )}
                                        </div>
                                    )}
                                </Field>

                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Owner</h3>
                                <Field name="ownerName">
                                    {({ field, form }: { field: any; form: any }) => (
                                        <div>
                                            <Input {...field} type="text" placeholder="Enter owner's email" />
                                            {form.errors.ownerName && form.touched.ownerName && (
                                                <span className="text-red-500 text-sm">{form.errors.ownerName}</span>
                                            )}
                                        </div>
                                    )}
                                </Field>
                            </div>
                        </div>

                        {/* Generate PDF Button */}
                        <div className="mt-6 flex justify-end">
                            <Button type="submit" variant="solid">
                                Generate PDF
                            </Button>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="mt-4 flex justify-end space-x-2">
                            <Button
                                variant="twoTone"
                                icon={<HiOutlineDocumentDuplicate />}
                                disabled={!generatedPdf || !values.selectedProduct}
                                onClick={() => copyDeliveryMessage(values)}
                            >
                                Copy Delivery Message
                            </Button>

                            <Button
                                variant="twoTone"
                                icon={<HiOutlineMail />}
                                disabled={!generatedPdf || !values.selectedProduct}
                                onClick={async (event) => {
                                    event.preventDefault();

                                    if (generatedPdf && values.selectedProduct && values.ownerName) {
                                        sendLicenseEmailMailto(
                                            values.ownerName,
                                            values.ownerName || "Customer",
                                            values.selectedProduct?.name ?? "Unknown Product",
                                            values.licenseType
                                        );
                                    } else {
                                        toast.push(
                                            <Notification type="danger" title="Generate the PDF and select a product first!" />,
                                            { placement: "bottom-start" }
                                        );
                                    }
                                }}
                            >
                                Send License by Email
                            </Button>
                        </div>

                    </Form>)
                }}
            </Formik>
        </div>
    );
};

export default CommercialLicenseGenerator;
