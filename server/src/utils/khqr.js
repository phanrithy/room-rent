import { BakongKHQR, IndividualInfo, khqrData } from 'bakong-khqr';

/**
 * Generate standard Bakong KHQR string and MD5 hash
 * @param {object} param0
 * @param {string} param0.bakongAccountId
 * @param {string} param0.merchantName
 * @param {string} param0.merchantCity
 * @param {number} param0.amountDollars - In USD (e.g. 150.00)
 * @param {string} param0.billNumber - Invoice #
 * @returns {{ qr: string, md5: string }}
 */
export function generateInvoiceKhqr({
  bakongAccountId = 'landlord@devb',
  merchantName = 'Sunrise Apartments',
  merchantCity = 'Phnom Penh',
  amountDollars,
  billNumber,
}) {
  try {
    const formattedAmount = parseFloat(Number(amountDollars).toFixed(2));
    const optional = {
      currency: khqrData.currency.usd,
      amount: formattedAmount,
      billNumber: String(billNumber),
      expirationTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const info = new IndividualInfo(
      bakongAccountId || 'landlord@devb',
      merchantName || 'Sunrise Apartments',
      merchantCity || 'Phnom Penh',
      optional
    );

    const khqr = new BakongKHQR();
    const res = khqr.generateIndividual(info);

    if (res && res.status && res.status.code === 0 && res.data) {
      return {
        qr: res.data.qr,
        md5: res.data.md5,
      };
    }

    console.warn('[KHQR] Generator warning:', res?.status?.message);
    return {
      qr: `00020101021229300016${bakongAccountId || 'landlord@devb'}5204599953038405406${formattedAmount}5802KH5918${merchantName}6010${merchantCity}62140110${billNumber}`,
      md5: null,
    };
  } catch (err) {
    console.error('[KHQR] Error generating KHQR:', err);
    return {
      qr: `00020101021229300016${bakongAccountId || 'landlord@devb'}5204599953038405406${amountDollars}5802KH5918${merchantName}6010${merchantCity}62140110${billNumber}`,
      md5: null,
    };
  }
}
