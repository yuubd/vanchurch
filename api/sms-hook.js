// Supabase SMS hook — accepts OTP send requests without a real SMS provider.
// Supabase calls this endpoint instead of Twilio when hook_send_sms is enabled.
// The client-side allow list in login.tsx is the real gate; this just satisfies
// GoTrue's requirement that the SMS hook responds with 200.
module.exports = function handler(req, res) {
  res.status(200).json({});
};
