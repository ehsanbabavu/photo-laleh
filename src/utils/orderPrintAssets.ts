import type { Order, PrintImageKey } from '../types';

export type OrderPrintAsset = {
  key: PrintImageKey;
  label: string;
  imageUrl: string;
};

type OrderPrintAssetSource = Pick<
  Order,
  'printSheetImage' | 'aiProcessedImage' | 'commercialImage' | 'commercialSheet10x15Image'
> & Partial<Pick<Order, 'selectedPrintImages'>>;

export function getOrderPrintAssets(order: OrderPrintAssetSource): OrderPrintAsset[] {
  const assets: Array<{ key: PrintImageKey; label: string; imageUrl?: string }> = [
    { key: 'sheet', label: 'شیت ۹تایی', imageUrl: order.printSheetImage },
    { key: 'ai', label: 'خروجی هوش مصنوعی', imageUrl: order.aiProcessedImage },
    {
      key: 'commercial',
      label: 'عکس تبلیغاتی',
      imageUrl: order.commercialSheet10x15Image || order.commercialImage
    }
  ];

  return assets.filter(
    (asset): asset is OrderPrintAsset =>
      typeof asset.imageUrl === 'string' && asset.imageUrl.trim().length > 0
  );
}

export function getSelectedOrderPrintAssets(
  order: OrderPrintAssetSource,
  selectedKeys?: unknown
): OrderPrintAsset[] {
  const available = getOrderPrintAssets(order);
  const requestedKeys = Array.isArray(selectedKeys)
    ? selectedKeys.filter(
        (key): key is PrintImageKey => key === 'sheet' || key === 'ai' || key === 'commercial'
      )
    : Array.isArray(order.selectedPrintImages)
    ? order.selectedPrintImages
    : available.map((asset) => asset.key);
  const selected = new Set(requestedKeys);

  return available.filter((asset) => selected.has(asset.key));
}
