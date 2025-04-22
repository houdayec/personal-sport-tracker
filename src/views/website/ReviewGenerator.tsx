import React, { useState } from "react";
import { fakerEN_US, fakerEN_GB, fakerES, fakerFR, fakerDE } from "@faker-js/faker";
import Papa from "papaparse";
import { FormContainer, FormItem, DatePicker, Input } from "@/components/ui";
import { Form, Formik, Field, FieldProps } from "formik";
import Button from '@/components/ui/Button'
import ProductReviewList from "./ProductReviewsList/ProductReviewList";

type Review = {
    review_content: string;
    review_score: number;
    date: string;
    product_id: string;
    display_name: string;
    email: string;
    order_id: string;
    media: string;
    locale: string; // Added locale to store country code
};

const locales = [
    { code: "en_US", weight: 0.40 },
    { code: "en_GB", weight: 0.24 },
    { code: "es_ES", weight: 0.10 },
    { code: "fr_FR", weight: 0.07 },
    { code: "de_DE", weight: 0.03 },
];

// Map country codes to flag emojis
const flagMap: Record<string, string> = {
    en_US: "🇺🇸",
    en_GB: "🇬🇧",
    es_ES: "🇪🇸",
    fr_FR: "🇫🇷",
    de_DE: "🇩🇪",
};

const ReviewGenerator: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [numReviews, setNumReviews] = useState(10);
    const [productId, setProductId] = useState("SKU123");
    const [startDate, setStartDate] = useState("2023-01-01");

    const getRandomLocale = () => {
        const localeMap = {
            en_US: fakerEN_US,
            en_GB: fakerEN_GB,
            es_ES: fakerES,
            fr_FR: fakerFR,
            de_DE: fakerDE,
        };

        let rnd = Math.random();
        let sum = 0;

        for (const locale of locales) {
            sum += locale.weight;
            if (rnd <= sum) {
                return {
                    code: locale.code,
                    faker: localeMap[locale.code as keyof typeof localeMap],
                };
            }
        }

        return { code: "en_US", faker: fakerEN_US };
    };

    const generateFakeReview = () => {
        const generatedReviews: Review[] = [];
        const start = new Date(startDate);

        for (let i = 0; i < numReviews; i++) {
            const localeData = getRandomLocale();
            const fakerInstance = localeData.faker;

            const firstName = fakerInstance.person.firstName();
            const lastName = fakerInstance.person.lastName();

            // Name format options with weights
            const nameFormats = [
                { format: `${firstName} ${lastName.toUpperCase()}`, weight: 0.25 }, // Corentin HOUDAYER
                { format: `${firstName} ${lastName}`, weight: 0.20 }, // Corentin Houdayer
                { format: firstName, weight: 0.15 }, // Corentin
                { format: `${firstName} ${lastName[0]}.`, weight: 0.10 }, // Corentin H.
                { format: `${firstName.toLowerCase()} ${lastName.toLowerCase()}`, weight: 0.10 }, // corentin houdayer
                { format: `${firstName.toUpperCase()} ${lastName.toUpperCase()}`, weight: 0.10 }, // CORENTIN HOUDAYER
                { format: firstName.toUpperCase(), weight: 0.05 }, // CORENTIN
                { format: "Anonymous", weight: 0.05 }, // Anonymous
            ];

            // Select a random name format based on weight
            const randomName = () => {
                let rnd = Math.random();
                let sum = 0;
                for (const option of nameFormats) {
                    sum += option.weight;
                    if (rnd <= sum) return option.format;
                }
                return firstName; // Fallback if no match
            };

            const displayName = randomName();
            const email = fakerInstance.internet.email().toLowerCase();
            const reviewScore = Math.random() < 0.10 ? 4 : 5;
            const date = new Date(start.getTime() + Math.random() * (Date.now() - start.getTime())).toISOString();
            const reviewContent = Math.random() < 0.50 ? fakerInstance.lorem.sentence() : "";

            generatedReviews.push({
                review_content: reviewContent,
                review_score: reviewScore,
                date: date,
                product_id: productId,
                display_name: displayName,
                email: email,
                order_id: "",
                media: "",
                locale: localeData.code, // Store country code
            });
        }

        setReviews(generatedReviews);
    };


    const exportToCSV = () => {
        const csv = Papa.unparse(reviews);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `reviews_${productId}.csv`);
        link.click();
    };

    return (
        <div className="bg-white">
            <h2 className="text-2xl font-bold mb-4">Review Generator</h2>

            <Formik
                initialValues={{
                    productId: "SKU123",
                    numReviews: 10,
                    startDate: new Date(),
                }}
                onSubmit={(values) => generateFakeReview()}
            >
                {({ values, errors, touched, setFieldValue, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <div className="md:grid grid-cols-3 gap-4">
                                <FormItem
                                    label="Product ID"
                                    invalid={errors.productId && touched.productId}
                                    errorMessage={errors.productId}
                                >
                                    <Field
                                        type="text"
                                        name="productId"
                                        placeholder="Enter Product ID"
                                        as={Input}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Number of Reviews"
                                    invalid={errors.numReviews && touched.numReviews}
                                    errorMessage={errors.numReviews}
                                >
                                    <Field
                                        type="number"
                                        name="numReviews"
                                        placeholder="Number of Reviews"
                                        as={Input}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Start Date"
                                    invalid={errors.startDate && touched.startDate}
                                    errorMessage={errors.startDate}
                                >
                                    <Field name="startDate">
                                        {({ field, form }: FieldProps) => (
                                            <DatePicker
                                                inputFormat="DD MMMM YYYY"
                                                field={field}
                                                form={form}
                                                value={field.value}
                                                onChange={(date) =>
                                                    form.setFieldValue(field.name, date)
                                                }
                                            />
                                        )}
                                    </Field>
                                </FormItem>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="solid" type="submit">
                                    Generate Reviews
                                </Button>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>

            {reviews.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-bold mb-2">Generated Reviews</h3>
                    {reviews.length > 0 && (
                        <Button
                            onClick={exportToCSV}
                            variant="twoTone"
                            className="mb-2"
                        >
                            Export to CSV
                        </Button>
                    )}
                    <div className="border p-4 rounded-md bg-gray-50 max-h-96 overflow-y-auto">
                        {reviews.map((review, index) => (
                            <div key={index} className="mb-2 border-b pb-2">
                                <p>
                                    <strong>{flagMap[review.locale]} {review.display_name}</strong>{" "}
                                    {review.date.split("T")[0]}
                                </p>
                                <p>{review.review_score} ⭐ | {review.review_content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <ProductReviewList />

        </div>
    );
};

export default ReviewGenerator;
