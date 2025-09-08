import { useState } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search, 
  MessageCircle, 
  Mail, 
  Phone,
  Book,
  Shield,
  CreditCard,
  Wallet,
  TrendingUp,
  Users,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface HelpCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    description: 'Learn the basics of using the exchange',
    articles: [
      {
        id: 'create-account',
        title: 'How to create an account',
        content: 'To create an account, click the Sign Up button and follow the registration process. You\'ll need to provide your email address and create a secure password.',
        category: 'getting-started'
      },
      {
        id: 'verify-identity',
        title: 'Identity verification process',
        content: 'For security and compliance, we require identity verification. Upload a clear photo of your government-issued ID and follow the verification steps.',
        category: 'getting-started'
      },
      {
        id: 'first-trade',
        title: 'Making your first trade',
        content: 'Navigate to the Exchange page, select your trading pair, enter the amount you want to buy or sell, and confirm your order.',
        category: 'getting-started'
      }
    ]
  },
  {
    id: 'wallets',
    title: 'Wallets & Deposits',
    icon: Wallet,
    description: 'Managing your cryptocurrency and fiat wallets',
    articles: [
      {
        id: 'deposit-crypto',
        title: 'How to deposit cryptocurrency',
        content: 'Go to Wallets, select the cryptocurrency you want to deposit, copy your wallet address, and send funds from your external wallet.',
        category: 'wallets'
      },
      {
        id: 'deposit-fiat',
        title: 'Depositing South African Rand (ZAR)',
        content: 'You can deposit ZAR via bank transfer. Go to Wallets, select ZAR, and follow the bank transfer instructions provided.',
        category: 'wallets'
      },
      {
        id: 'withdrawal-limits',
        title: 'Withdrawal limits and processing times',
        content: 'Withdrawal limits depend on your verification level. Standard withdrawals are processed within 24 hours for crypto and 1-3 business days for fiat.',
        category: 'wallets'
      }
    ]
  },
  {
    id: 'trading',
    title: 'Trading',
    icon: TrendingUp,
    description: 'Understanding trading features and order types',
    articles: [
      {
        id: 'order-types',
        title: 'Understanding order types',
        content: 'We support market orders (instant execution) and limit orders (execute at specific price). Choose the order type that best fits your trading strategy.',
        category: 'trading'
      },
      {
        id: 'trading-fees',
        title: 'Trading fees structure',
        content: 'Our trading fees are 0.1% per transaction. Fees are automatically deducted from your trade amount and displayed in your transaction history.',
        category: 'trading'
      },
      {
        id: 'market-data',
        title: 'Reading market data and charts',
        content: 'Charts show price movements, volume, and market trends. Use the time frame selector to view different periods and analyze price patterns.',
        category: 'trading'
      }
    ]
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    description: 'Keeping your account and funds secure',
    articles: [
      {
        id: 'two-factor-auth',
        title: 'Enable two-factor authentication (2FA)',
        content: 'Protect your account with 2FA using Google Authenticator or SMS. This adds an extra layer of security when logging in and making transactions.',
        category: 'security'
      },
      {
        id: 'secure-password',
        title: 'Creating a secure password',
        content: 'Use a strong, unique password with at least 12 characters including uppercase, lowercase, numbers, and special characters.',
        category: 'security'
      },
      {
        id: 'phishing-protection',
        title: 'Protecting against phishing attacks',
        content: 'Always check the URL is correct before entering your credentials. We will never ask for your password or 2FA codes via email or phone.',
        category: 'security'
      }
    ]
  },
  {
    id: 'fees',
    title: 'Fees & Payments',
    icon: CreditCard,
    description: 'Understanding our fee structure',
    articles: [
      {
        id: 'fee-schedule',
        title: 'Complete fee schedule',
        content: 'Trading: 0.1% per transaction. Withdrawal fees vary by cryptocurrency. ZAR withdrawals have no fees for amounts over R500.',
        category: 'fees'
      },
      {
        id: 'payment-methods',
        title: 'Supported payment methods',
        content: 'We support South African bank transfers (EFT), instant payments, and cryptocurrency deposits from external wallets.',
        category: 'fees'
      },
      {
        id: 'tax-reporting',
        title: 'Tax reporting and statements',
        content: 'Export your transaction history for tax purposes from the Activity page. Consult with a tax professional for advice on cryptocurrency taxation.',
        category: 'fees'
      }
    ]
  }
];

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'How long does it take to verify my account?',
    answer: 'Account verification typically takes 24-48 hours. During peak times, it may take up to 72 hours. You\'ll receive an email notification once verification is complete.'
  },
  {
    id: 'faq-2',
    question: 'What are the minimum deposit amounts?',
    answer: 'Minimum deposits are: BTC: 0.001, ETH: 0.01, USDT: 10, ZAR: R100. These minimums help cover network fees and processing costs.'
  },
  {
    id: 'faq-3',
    question: 'Can I cancel a pending order?',
    answer: 'Yes, you can cancel pending limit orders from the Activity page or your open orders section. Market orders cannot be cancelled as they execute immediately.'
  },
  {
    id: 'faq-4',
    question: 'What should I do if I forgot my password?',
    answer: 'Click "Forgot Password" on the login page. You\'ll receive a password reset link via email. Make sure to check your spam folder if you don\'t see it.'
  },
  {
    id: 'faq-5',
    question: 'Are my funds insured?',
    answer: 'We use industry-standard security measures including cold storage for the majority of funds. However, cryptocurrency investments carry inherent risks.'
  }
];

export default function HelpPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = HELP_CATEGORIES.flatMap(category => 
    category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredFAQs = FAQ_ITEMS.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sidebar
          isMobile
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Market Ticker */}
          <MarketTicker />

          {/* Page Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Help Center</h1>
                <p className="text-muted-foreground">
                  Find answers to your questions and learn how to use the platform
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-help"
              />
            </div>
          </div>

          <div className="flex-1">
            {searchQuery ? (
              /* Search Results */
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Search Results ({filteredArticles.length + filteredFAQs.length})
                </h2>
                
                {filteredArticles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Help Articles</h3>
                    <div className="space-y-3">
                      {filteredArticles.map((article) => (
                        <Card key={article.id} className="p-4">
                          <h4 className="font-medium mb-2">{article.title}</h4>
                          <p className="text-sm text-muted-foreground">{article.content}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {filteredFAQs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">FAQs</h3>
                    <Accordion type="single" collapsible className="space-y-2">
                      {filteredFAQs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {filteredArticles.length === 0 && filteredFAQs.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : (
              /* Default Help Content */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Help Categories */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {HELP_CATEGORIES.map((category) => (
                        <Card 
                          key={category.id} 
                          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <category.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{category.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                              <p className="text-xs text-primary mt-2">
                                {category.articles.length} articles
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                          
                          {selectedCategory === category.id && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="space-y-2">
                                {category.articles.map((article) => (
                                  <div key={article.id} className="p-2 rounded hover:bg-muted">
                                    <h4 className="text-sm font-medium">{article.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {article.content.substring(0, 100)}...
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* FAQ Section */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="space-y-2">
                      {FAQ_ITEMS.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Contact Support */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Need More Help?</h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Live Chat
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Support
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Us
                      </Button>
                    </div>
                  </Card>

                  {/* Documentation */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Documentation</h3>
                    <div className="space-y-2">
                      <a href="#" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                        <span className="text-sm">API Documentation</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a href="#" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                        <span className="text-sm">Trading Guide</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a href="#" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                        <span className="text-sm">Security Best Practices</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a href="#" className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                        <span className="text-sm">Fee Schedule</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </Card>

                  {/* Status */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">System Status</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Operational
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All systems are operating normally.
                    </p>
                    <a href="#" className="text-sm text-primary mt-2 inline-flex items-center">
                      View Status Page
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}