import React, { useState, useEffect } from 'react';
import { getAuth, multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { QRCodeCanvas } from 'qrcode.react';

const TotpEnrollment = () => {
    const [secret, setSecret] = useState<any>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [displayName, setDisplayName] = useState('Authenticator');

    const currentUser = getAuth().currentUser;

    useEffect(() => {
        const setupTotp = async () => {
            if (!currentUser) return;
            const session = await multiFactor(currentUser).getSession();
            const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
            setSecret(totpSecret);

            const uri = totpSecret.generateQrCodeUrl(currentUser.email || '', 'FontMaze Admin');
            setQrCodeUrl(uri);
        };

        setupTotp();
    }, []);

    const handleEnroll = async () => {
        if (!secret || !verificationCode) return;

        const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
        await multiFactor(currentUser!).enroll(assertion, displayName);
        alert("✅ TOTP MFA Enrolled!");
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold">Set up TOTP MFA</h2>

            {qrCodeUrl && (
                <div>
                    <QRCodeCanvas value={qrCodeUrl} />
                    <p className="text-sm mt-2">Scan this in Google Authenticator or another app.</p>
                </div>
            )}

            <input
                type="text"
                placeholder="Enter code from authenticator"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="border px-2 py-1 rounded"
            />

            <button
                onClick={handleEnroll}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                Confirm and Enroll
            </button>
        </div>
    );
};

export default TotpEnrollment;
