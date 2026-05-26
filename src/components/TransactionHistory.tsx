import { Receipt, FileText } from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import { useLanguage } from '../context/LanguageContext'
import { tr, t } from '../i18n/translations'
import type { TransactionItem } from '../services/paymentService'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral'> = {
  COMPLETED: 'success', PENDING: 'warning', FAILED: 'neutral', REFUNDED: 'neutral', CANCELLED: 'neutral',
}

export default function TransactionHistory({ transactions }: { transactions: TransactionItem[] }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (transactions.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 dark:bg-ink-700 text-ink-400 mb-3"><Receipt className="h-6 w-6" /></div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{t(tr.payment.noTransactions, language)}</h3>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{t(tr.payment.noTransactionsDesc, language)}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4 flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
        {t(tr.payment.transactionHistory, language)}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 dark:border-ink-700 text-xs text-ink-500 dark:text-ink-400">
              <th className="pb-2 text-left font-medium">{t(tr.payment.date, language)}</th>
              <th className="pb-2 text-left font-medium">{t(tr.payment.plan, language)}</th>
              <th className="pb-2 text-right font-medium">{t(tr.payment.amount, language)}</th>
              <th className="pb-2 text-center font-medium">{t(tr.payment.status, language)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50 dark:divide-ink-700/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/50 transition-colors">
                <td className="py-3 text-ink-700 dark:text-ink-300">{fmtDate(tx.createdAt)}</td>
                <td className="py-3 font-medium text-ink-900 dark:text-ink-50">{tx.order?.plan?.name || '—'}</td>
                <td className="py-3 text-right font-mono text-ink-900 dark:text-ink-50">{tx.amount} {tx.currency}</td>
                <td className="py-3 text-center"><Badge variant={STATUS_VARIANT[tx.status] || 'default'} size="sm">{tx.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
