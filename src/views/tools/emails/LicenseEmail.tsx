import * as React from "react";
import { Html, Button, Heading, Text, Container } from "@react-email/components";

export function LicenseEmail({ productName, licenseUrl }: { productName: string; licenseUrl: string }) {
    return (
        <Html lang="en">
            <Container>
                <Heading>🎉 Your Commercial License for {productName}</Heading>
                <Text>Dear Customer,</Text>
                <Text>Thank you for your purchase! Your license for <strong>{productName}</strong> is ready.</Text>
                <Button href={licenseUrl}>Download License</Button>
                <Text>Best Regards,</Text>
                <Text>Font Station Team</Text>
            </Container>
        </Html>
    );
}

export default LicenseEmail;
