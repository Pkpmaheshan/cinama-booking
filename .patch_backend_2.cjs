const fs = require('fs');
const path = require('path');

const basePath = 'D:/Client Projects/Panchayu NSBM/cinemaAPI';

let paymentControllerContent = fs.readFileSync(path.join(basePath, 'src/controllers/paymentController.ts'), 'utf8');
if (!paymentControllerContent.includes('bookingId: booking._id')) {
  paymentControllerContent = paymentControllerContent.replace(
    /res\.json\(\{ success: true, data: paymentConfig \}\);/g,
    "res.json({ success: true, data: { ...paymentConfig, bookingId: booking._id } });"
  );
  fs.writeFileSync(path.join(basePath, 'src/controllers/paymentController.ts'), paymentControllerContent);
  console.log('Added bookingId to createPaymentSession response.');
}
