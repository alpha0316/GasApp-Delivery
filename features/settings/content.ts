// Help and legal text for the rider app. The types and block helpers match the customer app.
// TODO: the topics below are SAMPLE rider copy so the screens render. Replace them with text
// the ops and legal teams have approved before release.

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'table'; head: [string, string]; rows: [string, string][] };

export interface Article {
  id: string;
  question: string;
  body: Block[];
}

export type TopicIcon = 'jobs' | 'earnings' | 'safety' | 'cylinder' | 'account' | 'app';

export interface Topic {
  id: string;
  title: string;
  icon: TopicIcon;
  articles: Article[];
}

export interface LegalSection {
  title: string;
  body: Block[];
}

const p = (text: string): Block => ({ kind: 'p', text });
const list = (...items: string[]): Block => ({ kind: 'list', items });
const steps = (...items: string[]): Block => ({ kind: 'steps', items });

export const HELP_TOPICS: Topic[] = [
  {
    id: 'jobs',
    title: 'Jobs & deliveries',
    icon: 'jobs',
    articles: [
      {
        id: 'job-flow',
        question: 'How does a job work?',
        body: [
          steps(
            'Accept a job request.',
            'Go to the customer and collect the empty cylinder.',
            'Fill it at the station the customer chose.',
            'Bring the full cylinder back and mark the job delivered.'
          ),
        ],
      },
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings & payouts',
    icon: 'earnings',
    articles: [{ id: 'payouts', question: 'When do I get paid?', body: [p('TODO: payout schedule from the ops team.')] }],
  },
  {
    id: 'safety',
    title: 'Safety',
    icon: 'safety',
    articles: [
      {
        id: 'handling',
        question: 'Handling cylinders safely',
        body: [list('Keep cylinders upright.', 'Never carry a leaking cylinder.', 'TODO: full safety guidance.')],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & documents',
    icon: 'account',
    articles: [{ id: 'documents', question: 'Updating my documents', body: [p('TODO')] }],
  },
];

export const LEGAL_UPDATED = 'November 2026';

const table = (head: [string, string], rows: [string, string][]): Block => ({ kind: 'table', head, rows });

// DRAFT rider Terms of Service, written from the "Payment Flow & Order Assignment Logic"
// product document (v1.0, Nov 2026) so the terms describe how the app actually works. Fees,
// wallet amounts, timings and strike rules match lib/pricing/feeSchedule.ts and the document:
// change them together. Every "[TODO: ...]" is a business or legal decision the document does
// not cover. Have a Ghanaian lawyer review the whole text before release, especially section 2
// (independent riders), section 12 (liability) and section 16 (governing law).
export const TERMS: LegalSection[] = [
  {
    title: '1. About these terms',
    body: [
      p(
        'These terms apply to you as a delivery rider on GasApp. GasApp connects customers who need their LPG cylinder refilled with riders, who collect the empty cylinder from the customer, fill it at a partner filling station and bring it back. By creating a rider account or accepting a job, you agree to these terms.'
      ),
      p('"We", "us" and "GasApp" mean [TODO: registered company name, registration number and address].'),
    ],
  },
  {
    title: '2. Your relationship with GasApp',
    body: [
      p(
        'You ride on GasApp as an independent rider, not as an employee. You choose when you go online. You are responsible for your own vehicle, fuel, phone, data and taxes, unless we agree otherwise in writing.'
      ),
      p(
        'While you are online you can decline jobs that are offered to you. A job that is assigned to you automatically (see section 6) can only be declined with a valid reason.'
      ),
      p('[TODO: legal to confirm this matches how riders are engaged, including any contract signed at onboarding.]'),
    ],
  },
  {
    title: '3. Who can ride',
    body: [
      p('To ride on GasApp you must:'),
      list(
        'Be at least 18 years old.',
        "Hold a valid driver's licence for your vehicle, and keep the vehicle roadworthy, registered and insured as the law requires.",
        'Pass our onboarding checks, including identity verification. [TODO: list the documents checked, e.g. Ghana Card, licence, vehicle registration, police report.]',
        'Use only the vehicle and number plate registered on your account.'
      ),
      p('Tell us straight away if any of your documents expire or change. We may pause your account until they are updated.'),
    ],
  },
  {
    title: '4. Your account',
    body: [
      list(
        'Give accurate details, including a phone number we can reach you on, and keep them up to date.',
        'Your account is personal. Do not share it or let anyone else do jobs for you.',
        'Keep your sign-in codes private. You are responsible for activity on your account.',
        'Your name, photo, rating, vehicle and number plate are shown to the customer on each job so they can identify you, and your live location is shared with them while the job is in progress.'
      ),
    ],
  },
  {
    title: '5. Your rider wallet',
    body: [
      p(
        'Every rider has a wallet in the app. It holds your digital earnings, and for cash orders it guarantees the GasApp platform fee, which we cannot collect from the customer ourselves.'
      ),
      table(
        ['Rule', 'Detail'],
        [
          ['Going online', 'Your wallet must hold at least GH₵50.00.'],
          ['Taking a cash order', 'Your available balance must cover the platform fee for that cylinder size (section 8).'],
          ['When the fee is reserved', 'The moment you accept a cash order, its platform fee is locked in your wallet.'],
          ['If the order is cancelled', 'The locked fee is released if the order is cancelled before you collect the cylinder.'],
          ['When the fee is taken', 'When you mark the cash order delivered, the locked fee is deducted from your wallet.'],
          ['Low balance', 'We send you a notification when your balance drops below GH₵20.00.'],
          ['Topping up', 'In the app, by MTN MoMo, Telecel (Vodafone) Cash or AirtelTigo Money.'],
        ]
      ),
    ],
  },
  {
    title: '6. How jobs are offered',
    body: [
      p("When you are online and available, jobs are offered to riders near the customer's chosen filling station:"),
      steps(
        'A new job is offered to the three nearest available riders within 5 km of the station. The first to accept within 30 seconds gets the job, and the others are told it has been taken.',
        'If nobody accepts within 30 seconds, the job is offered to the next riders within 10 km, for another 30 seconds.',
        'If there is still no answer, the job is assigned automatically to the closest available rider. You can only decline an automatic assignment by giving a valid reason.',
        'If every rider within 10 km is busy, the job may be queued for the busy rider expected to finish soonest. It starts automatically when that rider completes their current delivery. If the current delivery runs more than 15 minutes, the queued job is offered to other riders instead.'
      ),
      p('How many orders you carry depends on your vehicle:'),
      list(
        'Motorbike: one order at a time.',
        'Tricycle, car or truck: several orders at once, up to the limit shown in your profile. You collect every empty cylinder in the batch first, fill them together at the station, then deliver them one by one.',
        'If you accept a new order after you have filled a batch and are already delivering it, the new order joins your next batch. You start it once the current batch is delivered.'
      ),
      p(
        'Stay online only when you are ready to take jobs. Go offline before you take a break or end your shift. If you go offline or stop responding while a job is being offered to you, you are marked inactive and removed from the queue.'
      ),
    ],
  },
  {
    title: '7. Doing a job',
    body: [
      p('When you accept or are assigned a job, you agree to:'),
      steps(
        "Go to the customer and collect their empty cylinder. Check it matches the order and is safe to carry before you take it. If something doesn't match, report it in the app.",
        'Fill it at the filling station the customer chose, with the gas amount in the order.',
        'Return the full cylinder to the customer at the delivery location, and mark the job delivered in the app.'
      ),
      list(
        'Keep the app open during the job so the customer can follow your location, and update each step as it happens.',
        'Only do extras the customer ordered in the app, such as a rubber change.',
        'Contact customers only about the job, and only through the app or the number it shows.'
      ),
      p(
        'If a job is not moving forward, for example you have not reached the filling station within 20 minutes of being assigned, the order may be passed to our team to handle. [TODO: confirm this timing, since riders collect from the customer before going to the station.]'
      ),
    ],
  },
  {
    title: '8. Payments, cash and earnings',
    body: [
      p('Every order total is made up of the gas price, the delivery fee and the GasApp platform fee. Customers pay in one of two ways, shown in the app on each job:'),
      list(
        'Paid in the app: the customer has already paid in full by mobile money or card. Do not ask them for any money, except the cash extras below. The filling station is paid by GasApp, so you pay nothing at the station.',
        'Cash on delivery: pay the gas price to the filling station in cash when you fill the cylinder. When you deliver, collect the full order total shown in the app from the customer. Do not charge more or less.'
      ),
      p('Whichever way the customer pays, everyone receives the same amounts:'),
      table(
        ['Party', 'What they receive'],
        [
          ['Filling station', 'The gas price: from GasApp for orders paid in the app, or from you in cash for cash orders.'],
          ['You', 'The full delivery fee: paid to your wallet for orders paid in the app, or kept from the cash you collect for cash orders.'],
          ['GasApp', 'The platform fee: taken from the in-app payment, or deducted from your wallet for cash orders.'],
        ]
      ),
      p('The delivery fee depends on the distance:'),
      table(
        ['Distance', 'Delivery fee'],
        [
          ['0 – 3 km', 'GH₵8.00'],
          ['3 – 6 km', 'GH₵13.00'],
          ['6 – 10 km', 'GH₵18.00'],
          ['10 km and above', 'GH₵25.00'],
        ]
      ),
      p('The platform fee depends on the cylinder size:'),
      table(
        ['Cylinder size', 'Platform fee'],
        [
          ['Small', 'GH₵5.00'],
          ['Medium', 'GH₵8.00'],
          ['Large', 'GH₵12.00'],
        ]
      ),
      p('Some extras are always paid to you in cash by the customer, whichever way they paid for the order:'),
      table(
        ['Extra', 'Who pays you'],
        [
          ['Distance charge', 'Customer, in cash. Applies when they chose a station farther than the closest one.'],
          ['Rubber change', 'Customer, in cash, when ordered in the app.'],
        ]
      ),
      p(
        'Digital earnings in your wallet are paid out every Monday to your registered mobile money number. If your balance is below GH₵10.00, it rolls over to the following week. Your earnings, wallet balance and payouts are shown in the app.'
      ),
      p('We may change fees. The fees that apply to a job are the ones shown in the app when you accept it, and we will tell you in the app before fee changes take effect.'),
    ],
  },
  {
    title: '9. Cancelling or declining a job',
    body: [
      p(
        'If you cannot finish a job, cancel it in the app as soon as possible and give a reason. You can only cancel before you collect the cylinder. When you do, we immediately look for another rider for the customer.'
      ),
      p(
        "Once you have the customer's cylinder you must not cancel. Finish the job, or report the problem and contact support, who will arrange how the cylinder gets back to the customer."
      ),
      table(
        ['Situation', 'What happens'],
        [
          ['Cancelling with a valid reason (vehicle fault, emergency)', 'No penalty. The reason is recorded on the order.'],
          ['Cancelling with no reason or an invalid reason', 'One strike. Your priority for new jobs is reduced for 24 hours.'],
          ['Declining an automatic assignment without a valid reason', 'Treated as an unexcused cancellation: one strike.'],
          ['3 unexcused cancellations within 7 days', 'Your account is suspended pending review. You cannot go online until it is resolved.'],
        ]
      ),
      p('You can also pass a job you have accepted but not yet collected to other riders from the app, when that option is shown.'),
    ],
  },
  {
    title: '10. Safety and conduct',
    body: [
      list(
        'Follow road traffic laws and wear a helmet and other required safety gear.',
        'Carry cylinders upright and secured. Never carry a cylinder that is leaking or damaged: tell the customer and support instead.',
        'Do not carry more cylinders than your vehicle can carry safely.',
        'Do not smoke near cylinders or at filling stations.',
        'Do not use the app in a way that distracts you while riding.',
        'Never ride under the influence of alcohol or drugs.',
        'Be respectful to customers and station staff. Harassment, discrimination, threats or violence are not allowed.',
        "Do not overfill, tamper with, swap or keep a customer's cylinder or gas."
      ),
      p('If there is an accident, a gas leak or another emergency, make the area safe, call emergency services if needed, then tell us from Help & Support.'),
    ],
  },
  {
    title: '11. Ratings and reports',
    body: [
      p(
        'Customers can rate each delivery and report problems. We use ratings and reports to keep the service safe and fair. If your average rating stays low or we receive serious reports, we may contact you, give you guidance, or pause your account while we look into it. [TODO: state any minimum rating.]'
      ),
    ],
  },
  {
    title: '12. Responsibility for loss or damage',
    body: [
      p(
        "You are responsible for the customer's cylinder from when you collect it until you hand it back, and for cash you collect until it is settled. Report any loss or damage straight away."
      ),
      p(
        "[TODO: legal to write what riders are liable for (lost or damaged cylinders, cash shortfalls), what GasApp covers, any insurance provided, and the limits of GasApp's liability.]"
      ),
    ],
  },
  {
    title: '13. Pausing or closing your account',
    body: [
      p('We may pause or close your account if, for example:'),
      list(
        'Your documents expire or turn out to be false.',
        'You reach 3 unexcused cancellations within 7 days (section 9).',
        'You break these terms or the safety rules.',
        'You commit fraud, such as faking a delivery, or do not pay the station or settle cash you collected.',
        'We receive serious complaints that are confirmed.'
      ),
      p(
        'Where it is safe to do so, we will tell you why and give you a chance to respond. You can stop riding and ask us to close your account at any time. Any earnings you are owed, less any amount you owe GasApp, will be settled.'
      ),
    ],
  },
  {
    title: '14. Changes to these terms',
    body: [
      p(
        'We may update these terms, for example when fees or how jobs are offered change. We will tell you in the app before important changes take effect. If you keep riding after that, you accept the new terms.'
      ),
    ],
  },
  {
    title: '15. Disputes',
    body: [
      p(
        'If you have a problem with a job, a payment or your account, contact us from Help & Support first. We aim to reply within 24 hours and to resolve it with you.'
      ),
    ],
  },
  {
    title: '16. Governing law',
    body: [p('These terms are governed by the laws of Ghana. [TODO: legal to confirm, and add any arbitration or court terms.]')],
  },
  {
    title: '17. Contact',
    body: [p('Questions about these terms? Contact us from Help & Support. [TODO: add a support email and phone number.]')],
  },
];
export const PRIVACY: LegalSection[] = [{ title: '1. What we collect', body: [p('TODO: rider privacy policy from legal.')] }];
