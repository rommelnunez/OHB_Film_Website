export default function RulesPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="bg-[#ff3600] py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="heading text-3xl text-white">Official Rules</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="prose prose-invert prose-sm">
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="heading text-xl text-white mb-3">1. Eligibility</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Must be 17 years of age or older</li>
                <li>Must be a legal resident of the United States</li>
                <li>Must reside in an eligible city/market for the specific campaign</li>
                <li>One entry per person per campaign</li>
                <li>Employees of WG Pictures and their immediate families are not eligible</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">2. How to Enter</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Complete the entry form with valid information</li>
                <li>Provide a valid email address for ticket notification</li>
                <li>Confirm age and acceptance of these rules</li>
                <li>Complete the captcha verification (when enabled)</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">3. Entry Period</h2>
              <p>
                Each campaign has a specific start date displayed on the entry page.
                Giveaway campaigns run while supplies last and may close once all tickets
                have been claimed. Raffle campaigns additionally have an end date, and all
                entries must be received before the stated end time.
              </p>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">4. Prize Description</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Prize: Two (2) free movie tickets to a screening of "Our Hero, Balthazar"</li>
                <li>Approximate retail value: $30</li>
                <li>No cash alternative available</li>
                <li>Prize is non-transferable</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">5. Campaign Types</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Giveaway (while supplies last):</strong> Tickets are
                  distributed on a first-come, first-served basis to eligible entrants until the
                  available supply is exhausted.
                </li>
                <li>
                  <strong className="text-white">Raffle / Contest:</strong> Winners are selected at
                  random from all eligible entries after the campaign's stated end time. Odds depend
                  on the number of eligible entries received.
                </li>
                <li>The campaign page will indicate which type of campaign is active.</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">6. Notification</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  For giveaways, eligible entrants will be notified by email when tickets are
                  available for them, while supplies last.
                </li>
                <li>
                  For raffles, winners will be notified via email within 72 hours of the campaign
                  end date.
                </li>
                <li>Recipients must respond within 48 hours to claim their tickets</li>
                <li>Failure to respond may result in forfeiture and offering the tickets to another eligible entrant</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">7. General Conditions</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Void where prohibited by law</li>
                <li>Sponsor reserves the right to modify or cancel the giveaway at any time</li>
                <li>By entering, participants agree to these official rules</li>
                <li>No purchase necessary to enter or win</li>
                <li>All decisions of the Sponsor are final</li>
              </ul>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">8. Privacy</h2>
              <p>
                Information collected will be used solely for the purpose of administering this
                giveaway and will not be sold to third parties. See our{' '}
                <a href="/privacy" className="text-[#ff3600] underline">
                  Privacy Policy
                </a>{' '}
                for more information.
              </p>
            </section>

            <section>
              <h2 className="heading text-xl text-white mb-3">9. Sponsor</h2>
              <p>
                This giveaway is sponsored by WG Pictures.
                <br />
                Contact:{' '}
                <a href="mailto:info@wgpictures.com" className="text-[#ff3600] underline">
                  info@wgpictures.com
                </a>
              </p>
            </section>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a href="/freetickets" className="btn-primary inline-block">
            Back to Giveaways
          </a>
        </div>
      </div>
    </div>
  );
}
