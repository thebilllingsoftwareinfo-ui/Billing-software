import { redirect } from 'next/navigation';

export default function NewExpensePage() {
  redirect('/expenses?action=new');
}
