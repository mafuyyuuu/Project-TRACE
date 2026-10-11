/** CSV endpoints return JSON errors even when axios requested a blob. */
export async function decodeCsvError(error) {
  const data=error.response?.data;
  if(data && typeof data.text==='function') {
    try {error.response.data=JSON.parse(await data.text());} catch { /* retain generic network/download feedback */ }
  }
  return error;
}
