export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E5E1DA] mt-32">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-14">
          {/* ─── Brand Column ──────────────────────────── */}
          <div className="md:col-span-1">
            <span className="text-[18px] font-bold tracking-[0.2em] text-[#1A1A1A] uppercase">
              STORE
            </span>
            <p className="text-[13px] text-[#999999] leading-relaxed mt-4 max-w-[240px]">
              A curated collection of considered pieces.
            </p>
          </div>

          {/* ─── Products ─────────────────────────────── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Products
            </h4>
            <ul className="space-y-3">
              {['Smartphones', 'Laptops', 'Audio', 'Wearables', 'Cameras', 'Gaming'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[13px] text-[#999999] hover:text-[#1A1A1A] transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* ─── Company ──────────────────────────────── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {['About Us', 'Careers', 'Press', 'Blog', 'Contact'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[13px] text-[#999999] hover:text-[#1A1A1A] transition-colors duration-300"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Support ──────────────────────────────── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Support
            </h4>
            <ul className="space-y-3">
              {['Help Center', 'Returns', 'Shipping Policy', 'Warranty', 'Privacy Policy'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[13px] text-[#999999] hover:text-[#1A1A1A] transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* ─── Bottom Bar ────────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-[#E5E1DA] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#C9C4BC] tracking-wide">
            © {currentYear} Store. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
