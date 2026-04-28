// Headout Web UI Kit — interactive homepage components
// Split into small pieces for maintainability. All mounted in index.html.

const { useState } = React;

// ---------- Icons (Lucide-style inline SVG) ----------
const Icon = {
  search: (p={}) => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', ...p }, React.createElement('circle', { cx: 11, cy: 11, r: 8 }), React.createElement('path', { d: 'm21 21-4.3-4.3' })),
  heart: (p={}) => { const { filled, ...rest } = p; return React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest }, React.createElement('path', { d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z' })); },
  arrow: (p={}) => React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p }, React.createElement('path', { d: 'M5 12h14M13 5l7 7-7 7' })),
  close: (p={}) => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p }, React.createElement('path', { d: 'M18 6 6 18M6 6l12 12' })),
  star: (p={}) => React.createElement('svg', { width: 10, height: 10, viewBox: '0 0 24 24', fill: 'currentColor', ...p }, React.createElement('path', { d: 'M12 2l2.9 7h7.1l-5.8 4.2 2.2 7L12 15.9 5.6 20.2l2.2-7L2 9h7.1z' })),
  check: (p={}) => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p }, React.createElement('path', { d: 'M20 6 9 17l-5-5' })),
};

// ---------- Data ----------
const CITIES = [
  { name: 'New York', country: 'United States', img: '../../assets/images/city-newyork.jpg' },
  { name: 'London', country: 'United Kingdom', img: '../../assets/images/city-london.jpg' },
  { name: 'Dubai', country: 'United Arab Emirates', img: '../../assets/images/city-dubai.jpg' },
  { name: 'Rome', country: 'Italy', img: '../../assets/images/city-rome.jpg' },
  { name: 'Paris', country: 'France', img: '../../assets/images/city-paris.jpg' },
  { name: 'Singapore', country: 'Singapore', img: '../../assets/images/city-singapore.jpg' },
  { name: 'Barcelona', country: 'Spain', img: '../../assets/images/city-barcelona.jpg' },
];

const EXPERIENCES = [
  { id: 1, city: 'Athens', title: 'Acropolis & Parthenon Tickets with Audio Guide', img: '../../assets/images/exp-acropolis.jpg', rating: 4.4, reviews: '39,128', price: 42.31, badge: 'Free cancellation', features: ['Skip-the-line entry', 'Audio guide (10 languages)', 'Valid for full day', 'Mobile ticket accepted'] },
  { id: 2, city: 'London', title: 'Harry Potter™ Warner Bros. Studio with Transfers', img: '../../assets/images/exp-harrypotter.jpg', rating: 4.5, reviews: '10,616', price: 107.93, strike: 134.91, off: '20% off', badge: 'Selling out fast', hot: true, features: ['Round-trip coach transfers', 'Studio tour entry', 'Explore Diagon Alley', '8+ hours total experience'] },
  { id: 3, city: 'Dubai', title: 'Red Dunes Evening Desert Safari & BBQ Dinner', img: '../../assets/images/exp-dubai-safari.jpg', rating: 4.5, reviews: '1,160', price: 45.06, strike: 80.33, off: '44% off', badge: 'Free cancellation', features: ['Dune bashing 4×4', 'BBQ buffet dinner', 'Camel rides & henna', 'Live entertainment'] },
  { id: 4, city: 'London', title: 'Phantom of the Opera — West End Tickets', img: '../../assets/images/exp-phantom.jpg', rating: 4.7, reviews: '7,239', price: 42.16, badge: 'Best seller', features: ['Her Majesty\'s Theatre', '2hrs 30min show', 'Choose your seats', 'Instant confirmation'] },
  { id: 5, city: 'Paris', title: 'Paris Catacombs Reserved Access Tickets', img: '../../assets/images/exp-catacombs.jpg', rating: 4.4, reviews: '7,647', price: 54.65, features: ['Skip the queue', 'Audio guide included', 'Underground ossuary access', 'Mobile tickets'] },
  { id: 6, city: 'Rome', title: 'From Rome: Pompeii Tour & Amalfi Coast Day Trip', img: '../../assets/images/exp-pompeii.jpg', rating: 4.5, reviews: '258', price: 110.48, badge: 'Free cancellation', features: ['Guided Pompeii tour', 'Positano & Amalfi drive', '12-hour experience', 'Hotel pickup included'] },
  { id: 7, city: 'Barcelona', title: 'Park Güell Reserved Entry Tickets', img: '../../assets/images/exp-parkguell.jpg', rating: 4.4, reviews: '46,503', price: 27.03, features: ['Timed entry', 'Monumental zone access', 'Gaudí\'s living canvas', 'Valid 30 min window'] },
];

const CATEGORIES = [
  { name: 'London Theatre', city: 'London', img: '../../assets/images/cat-london-theatre.jpg' },
  { name: 'Dubai Desert Safari', city: 'Dubai', img: '../../assets/images/cat-dubai-safari.jpg' },
  { name: 'Vatican Museums', city: 'Rome', img: '../../assets/images/cat-vatican.jpg' },
  { name: 'Eiffel Tower', city: 'Paris', img: '../../assets/images/cat-eiffel.jpg' },
  { name: 'Burj Khalifa', city: 'Dubai', img: '../../assets/images/cat-burj.jpg' },
];

const THEMES = ['Tickets', 'Tours', 'Cruises', 'Food & Drink', 'Entertainment', 'Adventure', 'Water Sports', 'Wellness', 'Day Trips'];

// ---------- Components ----------
function TopNav() {
  return React.createElement('header', { className: 'nav' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'nav-inner' },
        React.createElement('div', { className: 'nav-logo' }, React.createElement('img', { src: '../../assets/logos/headout-purps.svg', alt: 'Headout' })),
        React.createElement('div', { className: 'nav-search' }, Icon.search({ width: 16, height: 16 }), React.createElement('span', null, 'Search experiences, cities, attractions…')),
        React.createElement('div', { className: 'nav-right' },
          React.createElement('a', null, 'English · USD'),
          React.createElement('a', null, 'Help'),
          React.createElement('button', { className: 'nav-signin' }, 'Sign in'),
        )
      )
    )
  );
}

function Hero({ onSearch }) {
  const [q, setQ] = useState('');
  return React.createElement('section', { className: 'hero' },
    React.createElement('div', { className: 'container' },
      React.createElement('h1', null, "The world's best experiences curated just for you"),
      React.createElement('form', { className: 'hero-search', onSubmit: (e) => { e.preventDefault(); onSearch(q); } },
        Icon.search(),
        React.createElement('input', { value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Search experiences and cities' }),
        React.createElement('button', { type: 'submit' }, 'Search')
      ),
      React.createElement('div', { className: 'hero-suggest' },
        ['Eiffel Tower · Paris', 'Burj Khalifa · Dubai', 'Vatican Museums · Rome', 'London Theatre', 'Empire State · NYC'].map((s) =>
          React.createElement('span', { key: s, className: 'hero-chip', onClick: () => onSearch(s) }, s)
        )
      )
    )
  );
}

function ValueProps() {
  const items = [
    { h: 'Only the finest', p: 'At Headout, you only find the best. We do the hard work so you don\'t have to.', c: 'p1' },
    { h: 'Greed is good', p: 'With quality, you also get lowest prices, last-minute availability and 24×7 support.', c: 'p2' },
    { h: 'Experience every flavour', p: 'Offbeat or mainstream, a tour or a show, a game or a museum — we have \'em all.', c: 'p3' },
    { h: 'No pain, only gain', p: 'Didn\'t love it? We\'ll give you your money back. Not cocky, just confident.', c: 'p4' },
  ];
  return React.createElement('div', { className: 'container' },
    React.createElement('div', { className: 'valprops' },
      items.map((v, i) => React.createElement('div', { key: i, className: 'vp ' + v.c },
        React.createElement('h3', null, v.h),
        React.createElement('p', null, v.p)
      ))
    )
  );
}

function CityRow({ onPick }) {
  return React.createElement('section', { className: 'section' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'section-h' },
        React.createElement('h2', null, 'Explore world\'s top destinations'),
        React.createElement('a', { className: 'see-all' }, 'See all ', Icon.arrow())
      ),
      React.createElement('div', { className: 'cities' },
        CITIES.slice(0, 6).map((c) => React.createElement('div', { key: c.name, className: 'city', style: { backgroundImage: `url('${c.img}')` }, onClick: () => onPick(c) },
          React.createElement('div', { className: 'city-label' },
            React.createElement('div', { className: 'city-name' }, c.name),
            React.createElement('div', { className: 'city-country' }, c.country)
          )
        ))
      )
    )
  );
}

function ExpCard({ item, favs, onFav, onOpen }) {
  const isFav = favs.has(item.id);
  return React.createElement('div', { className: 'exp-card', onClick: () => onOpen(item) },
    React.createElement('div', { className: 'exp-img', style: { backgroundImage: `url('${item.img}')` } },
      item.badge && React.createElement('div', { className: 'exp-badge' + (item.hot ? ' hot' : '') }, item.badge),
      React.createElement('button', { className: 'exp-heart' + (isFav ? ' active' : ''), onClick: (e) => { e.stopPropagation(); onFav(item.id); } },
        Icon.heart({ filled: isFav })
      )
    ),
    React.createElement('div', { className: 'exp-body' },
      React.createElement('div', { className: 'exp-city' }, item.city),
      React.createElement('h3', { className: 'exp-title' }, item.title),
      React.createElement('div', { className: 'exp-meta' },
        React.createElement('span', { className: 'exp-rating' }, Icon.star(), item.rating),
        React.createElement('span', null, '(' + item.reviews + ')')
      ),
      React.createElement('div', { className: 'exp-price-row' },
        React.createElement('span', { className: 'exp-from' }, 'from'),
        React.createElement('span', { className: 'exp-price' }, '$' + item.price.toFixed(2)),
        item.strike && React.createElement('span', { className: 'exp-price-strike' }, '$' + item.strike.toFixed(2)),
        item.off && React.createElement('span', { className: 'exp-price-off' }, item.off)
      )
    )
  );
}

function TopRecs({ favs, onFav, onOpen }) {
  return React.createElement('section', { className: 'section-tight' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'section-h' },
        React.createElement('h2', null, 'Headout\'s top recommendations'),
        React.createElement('a', { className: 'see-all' }, 'See all ', Icon.arrow())
      ),
      React.createElement('div', { className: 'exp-row' },
        EXPERIENCES.slice(0, 4).map((e) => React.createElement(ExpCard, { key: e.id, item: e, favs, onFav, onOpen }))
      )
    )
  );
}

function TopWorldwide({ onOpen }) {
  return React.createElement('section', { className: 'section' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'section-h' },
        React.createElement('h2', null, 'Top things to do worldwide'),
        React.createElement('a', { className: 'see-all' }, 'See all ', Icon.arrow())
      ),
      React.createElement('div', { className: 'cat-row' },
        CATEGORIES.map((c) => React.createElement('div', { key: c.name, className: 'cat', style: { backgroundImage: `url('${c.img}')` }, onClick: () => onOpen(null) },
          React.createElement('div', { className: 'cat-label' },
            React.createElement('div', { className: 'cat-name' }, c.name),
            React.createElement('div', { className: 'cat-city' }, c.city)
          )
        ))
      )
    )
  );
}

function Themes() {
  const [active, setActive] = useState('Tickets');
  return React.createElement('section', { className: 'section-tight' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'section-h' }, React.createElement('h2', null, 'Browse by themes')),
      React.createElement('div', { className: 'themes' },
        THEMES.map((t) => React.createElement('button', { key: t, className: 'theme-pill' + (active === t ? ' active' : ''), onClick: () => setActive(t) }, t))
      )
    )
  );
}

function Promo() {
  return React.createElement('section', { className: 'section' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'promo' },
        React.createElement('div', null,
          React.createElement('h2', null, 'Greed is good.', React.createElement('br'), 'So is saving 20%.'),
          React.createElement('p', null, 'First-time app download? Get 20% off any experience — because your first time should be unforgettable.'),
          React.createElement('button', { className: 'promo-cta' }, 'Download the app →')
        ),
        React.createElement('div', { className: 'promo-image', style: { backgroundImage: "url('../../assets/images/exp-parkguell.jpg')" } })
      )
    )
  );
}

function MoreExp({ favs, onFav, onOpen }) {
  return React.createElement('section', { className: 'section-tight' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'section-h' },
        React.createElement('h2', null, 'Offbeat or mainstream — we\'ve got \'em all'),
        React.createElement('a', { className: 'see-all' }, 'See all ', Icon.arrow())
      ),
      React.createElement('div', { className: 'exp-row' },
        EXPERIENCES.slice(3, 7).map((e) => React.createElement(ExpCard, { key: e.id, item: e, favs, onFav, onOpen }))
      )
    )
  );
}

function Trust() {
  return React.createElement('section', { className: 'trust' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'trust-grid' },
        React.createElement('div', null,
          React.createElement('div', { className: 'trust-num' }, '50M+'),
          React.createElement('div', { className: 'trust-lbl' }, 'Happy customers across 10,000+ experiences')
        ),
        React.createElement('div', null,
          React.createElement('div', { className: 'trust-num' }, '24×7'),
          React.createElement('div', { className: 'trust-lbl' }, 'Live help from local experts, anywhere, anytime')
        ),
        React.createElement('div', null,
          React.createElement('div', { className: 'trust-num' }, '200+'),
          React.createElement('div', { className: 'trust-lbl' }, 'Cities around the world and counting')
        ),
      )
    )
  );
}

function Footer() {
  return React.createElement('footer', { className: 'footer' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'footer-grid' },
        React.createElement('div', { className: 'footer-col' },
          React.createElement('div', { className: 'footer-logo' }, React.createElement('img', { src: '../../assets/logos/headout-purps.svg', alt: 'Headout' })),
          React.createElement('div', { className: 'footer-tag' }, 'Home to the world\'s most exceptional experiences. Unusual and unabashed since 2014.')
        ),
        React.createElement('div', { className: 'footer-col' },
          React.createElement('h4', null, 'Cities'),
          React.createElement('ul', null, ['New York', 'Paris', 'Rome', 'Dubai', 'London', '+200 more'].map((x) => React.createElement('li', { key: x }, React.createElement('a', null, x))))
        ),
        React.createElement('div', { className: 'footer-col' },
          React.createElement('h4', null, 'Headout'),
          React.createElement('ul', null, ['Our story', 'Careers', 'Newsroom', 'Travel blog', 'Reviews'].map((x) => React.createElement('li', { key: x }, React.createElement('a', null, x))))
        ),
        React.createElement('div', { className: 'footer-col' },
          React.createElement('h4', null, 'Help'),
          React.createElement('ul', null, ['Help center', 'Contact us', 'Partners', 'Affiliates', 'Creators'].map((x) => React.createElement('li', { key: x }, React.createElement('a', null, x))))
        ),
      ),
      React.createElement('div', { className: 'footer-bottom' }, '© 2014–2026 Headout, 82 Nassau St #60351 New York, NY 10038')
    )
  );
}

function ExpDetail({ item, onClose, onBook }) {
  if (!item) return null;
  return React.createElement('div', { className: 'overlay', onClick: onClose },
    React.createElement('div', { className: 'modal', onClick: (e) => e.stopPropagation() },
      React.createElement('div', { className: 'modal-img', style: { backgroundImage: `url('${item.img}')` } },
        React.createElement('button', { className: 'modal-close', onClick: onClose }, Icon.close())
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { className: 'modal-city' }, item.city),
        React.createElement('h2', null, item.title),
        React.createElement('div', { className: 'modal-meta' },
          React.createElement('span', { className: 'exp-rating' }, Icon.star(), item.rating),
          React.createElement('span', null, item.reviews + ' reviews'),
          React.createElement('span', null, '·'),
          React.createElement('span', null, 'Instant confirmation')
        ),
        React.createElement('p', null, 'Step into a bucket-list moment. This experience is hand-picked by our team for its quality, authenticity, and reliability — so you get the best without the research. Mobile tickets, 24×7 support, and our money-back promise included.'),
        React.createElement('div', { className: 'modal-features' },
          item.features.map((f, i) => React.createElement('div', { key: i, className: 'modal-feature' }, Icon.check(), React.createElement('span', null, f)))
        ),
        React.createElement('div', { className: 'modal-price-row' },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 12, color: 'var(--fg-3)', marginBottom: 2 } }, 'from'),
            React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline' } },
              React.createElement('span', { className: 'exp-price', style: { fontSize: 24 } }, '$' + item.price.toFixed(2)),
              item.strike && React.createElement('span', { className: 'exp-price-strike' }, '$' + item.strike.toFixed(2)),
              item.off && React.createElement('span', { className: 'exp-price-off' }, item.off)
            )
          ),
          React.createElement('button', { className: 'modal-book', onClick: () => onBook(item) }, 'Book now')
        )
      )
    )
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return React.createElement('div', { className: 'toast' }, Icon.heart({ filled: true, width: 16, height: 16, style: { color: 'var(--color-candy)' } }), React.createElement('span', null, msg));
}

Object.assign(window, { TopNav, Hero, ValueProps, CityRow, TopRecs, TopWorldwide, Themes, Promo, MoreExp, Trust, Footer, ExpDetail, Toast, Icon });
