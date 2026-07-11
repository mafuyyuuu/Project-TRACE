const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

async function runAudit() {
  console.log('🚀 Starting End-to-End System Audit...\n');
  
  let studentToken, financeToken, secToken, window1Token;
  let documentId, trackingNumber;

  // Helper for requests
  const req = async (endpoint, method, body, token, isFormData = false) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const options = {
      method,
      headers,
    };
    
    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  // 1. Authenticate all roles
  console.log('1️⃣ Authenticating Roles...');
  try {
    studentToken = (await req('/auth/login', 'POST', { employee_id: 'STU2024001', password: 'trace2024' })).token;
    financeToken = (await req('/auth/login', 'POST', { employee_id: 'FINANCE001', password: 'trace2024' })).token;
    secToken = (await req('/auth/login', 'POST', { employee_id: 'SEC001', password: 'trace2024' })).token;
    window1Token = (await req('/auth/login', 'POST', { employee_id: 'WINDOW1001', password: 'trace2024' })).token;
    console.log('✅ All roles authenticated successfully.');
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    return;
  }

  // 2. Student Submits a Request
  console.log('\n2️⃣ Student Submitting New Request...');
  try {
    const form = new FormData();
    form.append('document_type', 'Transcript of Records');
    form.append('purpose', JSON.stringify({ reason: 'Audit Test', semesters: 8 }));
    form.append('copies', '2');
    form.append('amount', '200.00'); // 2 copies * 100
    // We append a Blob instead of Buffer for native fetch FormData
    const mockFile = new Blob(['mock pdf content'], { type: 'application/pdf' });
    form.append('document', mockFile, 'requirements.pdf');

    const data = await req('/documents/upload', 'POST', form, studentToken, true);
    documentId = data.document.id;
    trackingNumber = data.document.tracking_number;
    console.log(`✅ Request submitted! ID: ${documentId}, Tracking: ${trackingNumber}`);
  } catch (err) {
    console.error('❌ Request submission failed:', err.message);
    return;
  }

  // 3. Student Pays via GCash
  console.log('\n3️⃣ Student Submitting GCash Payment...');
  try {
    const form = new FormData();
    form.append('gcash_reference_no', 'GCASH999999');
    const mockReceipt = new Blob(['mock receipt content'], { type: 'image/jpeg' });
    form.append('receipt', mockReceipt, 'receipt.jpg');

    const data = await req(`/documents/${documentId}/submit-payment`, 'POST', form, studentToken, true);
    console.log('✅ Payment submitted. Message:', data.message);
  } catch (err) {
    console.error('❌ Payment failed:', err.message);
    return;
  }

  // 4. Finance Clerk Verifies Payment
  console.log('\n4️⃣ Finance Clerk Verifying Payment...');
  try {
    const data = await req(`/documents/${documentId}/verify-payment`, 'POST', { action: 'approve' }, financeToken);
    console.log('✅ Payment verified. Message:', data.message);
  } catch (err) {
    console.error('❌ Payment verification failed:', err.message);
    return;
  }

  // 5. Secretary Evaluates Document
  console.log('\n5️⃣ College Secretary Evaluating Document...');
  try {
    const data = await req(`/documents/${documentId}/evaluate`, 'POST', { action: 'approve', notes: 'Audit passed OCR checks.' }, secToken);
    console.log('✅ Document evaluated. Message:', data.message);
  } catch (err) {
    console.error('❌ Evaluation failed:', err.message);
    return;
  }

  // 6. Window 1 Clerk Releases Document
  console.log('\n6️⃣ Window 1 Clerk Releasing Document...');
  try {
    const data = await req(`/documents/${documentId}/release`, 'POST', {}, window1Token);
    console.log('✅ Document released. Final Message:', data.message);
  } catch (err) {
    console.error('❌ Release failed:', err.message);
    return;
  }

  console.log('\n🎉 End-to-End System Audit Complete! All critical paths function normally.');
}

runAudit();
