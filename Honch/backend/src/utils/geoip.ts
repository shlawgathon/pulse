export async function getGeo(ip: string): Promise<{ countryCode: string; city: string }> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,city,status`);
    const data = await res.json();
    if (data.status === 'success') {
      return { countryCode: data.countryCode || '', city: data.city || '' };
    }
    return { countryCode: '', city: '' };
  } catch {
    return { countryCode: '', city: '' };
  }
}
