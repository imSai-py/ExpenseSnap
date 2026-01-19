import { useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle, Mail } from 'lucide-react';

interface HelpSupportSettingsProps {
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I reset my data?',
    answer:
      'To reset your expense data, go to your Profile page and delete individual expenses from the Dashboard. Currently, bulk delete is not available. For complete account reset, please contact support.',
  },
  {
    question: 'How do I add a new expense?',
    answer:
      'Tap the "+" button at the bottom of the Dashboard to add a new expense. Enter the item name, amount, select a category, and choose whether it\'s an income or expense. Then tap "Add" to save.',
  },
  {
    question: 'How do I change my currency?',
    answer:
      'Go to your Profile page and click on the currency badge below your name. A dropdown will appear where you can select your preferred currency from options like USD, EUR, GBP, INR, and more.',
  },
  {
    question: 'Can I edit or delete an expense?',
    answer:
      'Yes! On the Dashboard, swipe left on any expense to reveal the delete option. To edit an expense, tap on it to open the edit form where you can modify the details.',
  },
  {
    question: 'How do I view my spending statistics?',
    answer:
      'Navigate to the Statistics page using the bottom navigation bar (or sidebar on desktop). Here you can see your spending breakdown by category, income vs expenses chart, and filter by different time periods.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes, your data is securely stored and encrypted. We use industry-standard security practices including password hashing and secure session management. Your financial data is never shared with third parties.',
  },
];

export function HelpSupportSettings({ onClose }: HelpSupportSettingsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-[#F3F4F6] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#111827]" />
        </button>
        <h1 className="text-xl font-semibold text-[#111827]">Help & Support</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#111827]">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-sm text-[#6B7280]">Find answers to common questions</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="overflow-hidden">
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F9FAFB] transition-colors"
                  >
                    <span className="text-[#111827] font-medium pr-4">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#6B7280] flex-shrink-0 transition-transform duration-200 ${expandedIndex === index ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${expandedIndex === index ? 'max-h-96' : 'max-h-0'
                      }`}
                  >
                    <div className="px-6 pb-4">
                      <p className="text-[#6B7280] text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-lg font-semibold text-[#111827]">Need More Help?</h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Can't find what you're looking for? Reach out to us.
              </p>
            </div>

            <div className="p-6 space-y-3">
              <a
                href="mailto:support@expensesnap.com"
                className="flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-xl hover:bg-[#F3F4F6] transition-colors"
              >
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-[#111827] font-medium">Email Support</p>
                  <p className="text-[#6B7280] text-sm">sailakshman212005@gmail.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* App Version */}
          <div className="text-center pt-4">
            <p className="text-[#9CA3AF] text-sm">ExpenseSnap v1.0.0</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Made with care for your finances</p>
          </div>
        </div>
      </div>
    </div>
  );
}
