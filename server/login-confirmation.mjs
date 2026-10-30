import { ServiceError } from './providers.mjs';

// Keep the one-time confirmation cookie inside the privileged host. A profile
// timeout must not force a second exchange of an already-consumed QR code.
export async function loginConfirmation(source, item, providers, persist = async () => {}) {
  if (!item.cookie) {
    const check = await providers.check(source, item.upstreamKey ?? item.key);
    if (check.code !== 803) {
      if (![801, 802].includes(check.code))
        throw new ServiceError('二维码已过期或登录未完成，请重新扫码', 410);
      return { status: check.code === 802 ? 'scanned' : 'waiting' };
    }
    if (!check.cookie) throw new ServiceError('平台未返回登录会话');
    item.cookie = check.cookie;
    await persist();
  }
  const candidate = { source, cookie: item.cookie };
  for (let attempt = 0; ; attempt++) {
    try {
      candidate.profile = await providers.profile(source, candidate);
      break;
    } catch (error) {
      if (error.status !== 401) throw error;
      if (attempt >= 2)
        throw new ServiceError('平台已确认授权，账户信息尚未就绪，请稍后重试', 503);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return { candidate };
}
