import { InvoiceForm } from '@/components/ppe/invoice-form';
import { PPENav } from '@/components/ppe/ppe-nav';

export default function NewPPEInvoicePage() {
  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-4">PPE</h1>
        <PPENav />
        <h2 className="text-lg font-semibold mb-3">Capture Supplier Invoice</h2>
        <InvoiceForm />
      </div>
    </div>
  );
}
