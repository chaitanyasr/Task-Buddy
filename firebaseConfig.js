// Firebase project config — REST API based (no SDK needed)
export const FIREBASE_PROJECT_ID = 'day-flow-14a69';
export const FIREBASE_API_KEY = 'AIzaSyD4jmVsR41Wc7iueNns_XDlVFpNDbIrZeY';

export function safeEmailKey(email) {
  return email.toLowerCase().replace(/\./g, '_').replace(/@/g, '__at__');
}

const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function firestoreGet(collection, docId) {
  const url = `${BASE}/${collection}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return parseFirestoreDoc(json);
}

export async function firestoreSet(collection, docId, data) {
  const url = `${BASE}/${collection}/${docId}?key=${FIREBASE_API_KEY}`;
  const body = JSON.stringify({ fields: toFirestoreFields(data) });
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return res.ok;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(val) };
    else fields[key] = { stringValue: JSON.stringify(val) };
  }
  return fields;
}

function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const key in doc.fields) {
    const field = doc.fields[key];
    if (field.stringValue !== undefined) {
      try { result[key] = JSON.parse(field.stringValue); }
      catch { result[key] = field.stringValue; }
    } else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.integerValue !== undefined) result[key] = Number(field.integerValue);
    else result[key] = null;
  }
  return result;
}
