'use client';

import React, { useState } from 'react';

interface CheckoutPanelProps {
  seats: string[];
  totalPrice: number;
  paymentMethod: 'CARD' | 'UPI' | null;
  processing: boolean;
  onPaymentMethodChange: (method: 'CARD' | 'UPI') => void;
  onPay: () => void;
}

/** Collect a payment choice without retaining or submitting sensitive payment values. */
export function CheckoutPanel({ seats, totalPrice, paymentMethod, processing, onPaymentMethodChange, onPay }: CheckoutPanelProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const ready = seats.length === 3 && paymentMethod !== null;
  return <section className="checkout-panel" aria-labelledby="payment-title">
    <p className="eyebrow">Step 2 · Payment</p><h2 id="payment-title">Choose how you will pay</h2>
    <fieldset><legend>Payment method</legend><label><input type="radio" name="payment-method" checked={paymentMethod === 'CARD'} onChange={() => onPaymentMethodChange('CARD')} /> Card</label><label><input type="radio" name="payment-method" checked={paymentMethod === 'UPI'} onChange={() => onPaymentMethodChange('UPI')} /> UPI</label></fieldset>
    {paymentMethod === 'CARD' ? <div className="payment-fields"><label>Card number<input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} inputMode="numeric" autoComplete="cc-number" /></label><label>Expiry<input value={expiry} onChange={(event) => setExpiry(event.target.value)} autoComplete="cc-exp" /></label><label>CVV<input value={cvv} onChange={(event) => setCvv(event.target.value)} inputMode="numeric" autoComplete="cc-csc" /></label></div> : null}
    {paymentMethod === 'UPI' ? <label>UPI ID<input value={upiId} onChange={(event) => setUpiId(event.target.value)} autoComplete="off" /></label> : null}
    <div className="checkout-total"><span>Fixed total</span><strong>Rs.{totalPrice}</strong></div>
    <button type="button" disabled={!ready || processing} onClick={onPay}>{processing ? 'Processing…' : 'Pay Rs.450'}</button>
  </section>;
}
