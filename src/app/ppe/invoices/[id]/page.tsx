'use client';

import { useParams } from 'next/navigation';
import { InvoiceForm } from '@/components/ppe/invoice-form';
import { PPENav } from '@/components/ppe/ppe-nav';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useApiData } from '@/hooks/use-api-data';
import type { PPEInvoiceDetail } from '@/types/database';

export default function EditPPEInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const isValidId = Number.isInteger(id) && id > 0;
  const { data: invoice, isLoading, error } = useApiData<PPEInvoiceDetail | null>(
    isValidId ? `/api/ppe/invoices?id=${id}` : null,
    null
  );

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-4">PPE</h1>
        <PPENav />
        <h2 className="text-lg font-semibold mb-3">
          Edit Supplier Invoice{invoice ? ` ${invoice.Invoice_No}` : ''}
        </h2>
        {!isValidId && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">Invalid invoice ID.</div>}
        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {isLoading ? <LoadingSpinner /> : invoice && <InvoiceForm key={invoice.ID} invoice={invoice} />}
      </div>
    </div>
  );
}
