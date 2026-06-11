export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Helvetia</h3>
            <p className="text-sm leading-relaxed">
              Endüstriyel makine ve ekipman çözümlerinde güvenilir partneriniz.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Hızlı Bağlantılar</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white transition-colors">Ana Sayfa</a></li>
              <li><a href="/hakkimizda" className="hover:text-white transition-colors">Hakkımızda</a></li>
              <li><a href="/iletisim" className="hover:text-white transition-colors">İletişim</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">İletişim</h4>
            <ul className="space-y-2 text-sm">
              <li>info@helvetia.com</li>
              <li>+90 212 000 00 00</li>
              <li>İstanbul, Türkiye</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
          © {new Date().getFullYear()} Helvetia. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
