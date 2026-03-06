const DEFAULT_CALCOM_30MIN_URL = "https://cal.com/get-trai.ai";
const DEFAULT_PRODUCT_APP_URL = "https://app.usetrailai.com";

function cleanRawUrl(url: string): string {
  return url.trim().replace(/[.,;:!?]+$/, "");
}

function normalizeAbsoluteUrl(rawUrl: string, fallbackUrl: string): string {
  const cleanedUrl = cleanRawUrl(rawUrl);

  try {
    const parsed = new URL(cleanedUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallbackUrl;
    }
    return parsed.toString();
  } catch {
    return fallbackUrl;
  }
}

function buildProductLoginUrl(productAppUrl: string): string {
  const fallbackLoginUrl = `${productAppUrl.replace(/\/+$/, "")}/login`;
  const configuredLoginUrl = process.env.NEXT_PUBLIC_PRODUCT_LOGIN_URL ?? fallbackLoginUrl;
  return normalizeAbsoluteUrl(configuredLoginUrl, fallbackLoginUrl);
}

const CALCOM_30MIN_URL = normalizeAbsoluteUrl(
  process.env.NEXT_PUBLIC_CALCOM_30MIN_URL ?? DEFAULT_CALCOM_30MIN_URL,
  DEFAULT_CALCOM_30MIN_URL
);
const CALCOM_15MIN_URL = cleanRawUrl(process.env.NEXT_PUBLIC_CALCOM_15MIN_URL ?? "");
const PRODUCT_APP_URL = normalizeAbsoluteUrl(
  process.env.NEXT_PUBLIC_PRODUCT_APP_URL ?? DEFAULT_PRODUCT_APP_URL,
  DEFAULT_PRODUCT_APP_URL
);
const PRODUCT_LOGIN_URL = buildProductLoginUrl(PRODUCT_APP_URL);

export const siteConfig = {
  productName: "trai\\",
  founderName: "Prasoon Pathak",
  founderRole: "Co-Founder, trai\\",
  founderLinkedInUrl:
    process.env.NEXT_PUBLIC_FOUNDER_LINKEDIN_URL ??
    "https://www.linkedin.com/in/prasoonpathak",
  calcom30MinUrl: CALCOM_30MIN_URL,
  calcom15MinUrl: CALCOM_15MIN_URL,
  productAppUrl: PRODUCT_APP_URL,
  productLoginUrl: PRODUCT_LOGIN_URL,
};

export function isCalComUrl(url: string): boolean {
  return /^https:\/\/cal\.com\/.+/i.test(cleanRawUrl(url));
}

export function normalizeBookingUrl(url: string): string {
  const cleanedUrl = cleanRawUrl(url);

  try {
    const parsed = new URL(cleanedUrl);
    return parsed.toString();
  } catch {
    return cleanedUrl;
  }
}
