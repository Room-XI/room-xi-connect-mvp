import { Phone, MessageCircle, Heart, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SafetyResources() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">You're Not Alone</h1>
              <p className="text-gray-600">Help is available 24/7</p>
            </div>
          </div>
          
          <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">If you're in immediate danger</p>
                <p className="text-rose-800 text-sm">Call 911 or go to your nearest emergency room</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center gap-3 text-white">
                <Phone className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Crisis Lines</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">Kids Help Phone</h3>
                <a href="tel:1-800-668-6868" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  1-800-668-6868
                </a>
                <p className="text-sm text-gray-600 mt-1">Free, confidential support 24/7 for youth</p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">Hope for Wellness (Indigenous Youth)</h3>
                <a href="tel:1-855-242-3310" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  1-855-242-3310
                </a>
                <p className="text-sm text-gray-600 mt-1">Culturally safe support, available 24/7</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">Alberta Health Link</h3>
                <a href="tel:811" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  811
                </a>
                <p className="text-sm text-gray-600 mt-1">Speak with a registered nurse 24/7</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">Distress Centre Calgary</h3>
                <a href="tel:403-266-4357" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  403-266-4357
                </a>
                <p className="text-sm text-gray-600 mt-1">24/7 crisis support and suicide prevention</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">Edmonton Crisis Diversion</h3>
                <a href="tel:211" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  211
                </a>
                <p className="text-sm text-gray-600 mt-1">Connect to mental health and addiction services</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex items-center gap-3 text-white">
                <MessageCircle className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Text & Chat Support</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900">Kids Help Phone - Text</h3>
                <p className="text-lg text-gray-700">Text <span className="font-bold">CONNECT</span> to</p>
                <p className="text-2xl font-bold text-green-600">686868</p>
                <p className="text-sm text-gray-600 mt-1">Free 24/7 crisis support by text</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900">Kids Help Phone - Live Chat</h3>
                <a 
                  href="https://kidshelpphone.ca/get-support/live-chat/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
                >
                  Start a chat <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-sm text-gray-600 mt-1">Chat with a counselor anytime</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900">Crisis Text Line (Canada)</h3>
                <p className="text-lg text-gray-700">Text <span className="font-bold">HOME</span> to</p>
                <p className="text-2xl font-bold text-green-600">741741</p>
                <p className="text-sm text-gray-600 mt-1">Free 24/7 support via text</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <div className="flex items-center gap-3 text-white">
                <ExternalLink className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Online Resources</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <a 
                href="https://www.mentalhealthcommission.ca/English/what-we-do/mental-health-first-aid"
                target="_blank"
                rel="noopener noreferrer"
                className="block border-l-4 border-purple-500 pl-4 hover:bg-purple-50 transition-colors p-2 -ml-2 rounded-r"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  Mental Health Commission of Canada
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                </h3>
                <p className="text-sm text-gray-600">Resources and mental health first aid</p>
              </a>

              <a 
                href="https://www.alberta.ca/mental-health-services.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="block border-l-4 border-purple-500 pl-4 hover:bg-purple-50 transition-colors p-2 -ml-2 rounded-r"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  Alberta Mental Health Services
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                </h3>
                <p className="text-sm text-gray-600">Find mental health services in Alberta</p>
              </a>

              <a 
                href="https://www.camh.ca/en/health-info/mental-health-and-covid-19/information-for-youth"
                target="_blank"
                rel="noopener noreferrer"
                className="block border-l-4 border-purple-500 pl-4 hover:bg-purple-50 transition-colors p-2 -ml-2 rounded-r"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  CAMH Youth Mental Health
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                </h3>
                <p className="text-sm text-gray-600">Information and coping strategies</p>
              </a>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Remember</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>You deserve support and it's okay to ask for help</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>All of these services are confidential and free</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>Reaching out is a sign of strength, not weakness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>You can also talk to a trusted adult, teacher, or counselor</span>
              </li>
            </ul>
          </div>

          <div className="text-center py-4">
            <Link 
              to="/home" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
