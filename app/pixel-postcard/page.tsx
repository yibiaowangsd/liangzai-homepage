import type { Metadata } from 'next';
import Postcard from './Postcard';

export const metadata: Metadata = {
  title: '像素明信片 · 好奇游乐场',
  description: '从一张十六格见方的邮票开始，画完可以下载，也可以把画藏进链接送给远方的人。',
};

export default function PixelPostcardPage() {
  return <Postcard />;
}
