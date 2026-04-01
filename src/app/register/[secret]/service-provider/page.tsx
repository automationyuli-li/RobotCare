import { notFound } from 'next/navigation';
import RegisterForm from './RegisterForm';

export default async function Page({ params }: { params: { secret: string } }) {
  if (params.secret !== process.env.REGISTER_SECRET) {
    notFound();
  }
  return <RegisterForm />;
}