import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Accordion, Heading, TextReveal } from '../components/ui.jsx'
import { Newsletter, PillBtn } from '../components/Layout.jsx'
import { Sec } from '../components/Page.jsx'
import { Video } from '../components/Media.jsx'
import {
  ServicePanel,
  Packages,
  Why,
  Stats,
  TeamGrid,
  BlogCard,
  BookPanel,
} from '../components/sections.jsx'

function Home() {
  const { TESTIMONIALS, BLOGS, FAQS, STEPS, SITE, sec } = useData()
  const hero = sec('home', 'hero')
  const about = sec('home', 'about')
  const shock = sec('home', 'shockwave')
  const ex = shock?.extra || {}

  const [i, setI] = useState(0)

  useEffect(() => {
    if (TESTIMONIALS.length < 2) return undefined

    const timer = setInterval(() => {
      setI((current) => (current + 1) % TESTIMONIALS.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [TESTIMONIALS.length])

  const t = TESTIMONIALS[i % (TESTIMONIALS.length || 1)]

  const heroVideo = hero?.video_url || hero?.video || ''
const heroImage = hero?.image_url || ''

const heroBg = !heroVideo && heroImage
  ? {
      backgroundImage: `linear-gradient(
        180deg,
        rgba(10,20,15,0) 35%,
        rgba(10,20,15,.85) 100%
      ), url("${mediaUrl(heroImage)}")`,
    }
  : undefined

  return (
    <>
      {hero && (
  <section
    className="relative mx-5 flex min-h-[640px] items-end overflow-hidden rounded-[30px] bg-ink bg-cover bg-center text-white lg:min-h-[calc(100vh-20px)]"
    style={heroBg}
  >
    {/* Background Video */}
    {heroVideo && (
      <video
        key={heroVideo}
        src={mediaUrl(heroVideo)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          console.error(
            'Hero video failed to load:',
            event.currentTarget.currentSrc
          )
        }}
      />
    )}

    {/* Dark overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

    {/* Hero Content */}
    <div className="relative z-10 grid w-full items-end gap-8 px-6 pb-10 lg:grid-cols-[1.7fr_1fr] lg:px-8">

      <h1 className="a-up text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
        {hero.title}
      </h1>

      <div className="a-up d2 lg:pb-3">
        <p className="max-w-sm text-base font-medium leading-8">
          {hero.body}
        </p>

        <PillBtn
          to="/contact-us#contact"
          className="mt-6 !py-2 !pl-7 !text-sm"
        >
          Book Your Assessment
        </PillBtn>
      </div>

    </div>
  </section>
)}

      {about && (
        <Sec>
          <div className="grid items-center gap-10 md:grid-cols-[.8fr_1fr]">
            {about.image_url && (
              <img
                src={mediaUrl(about.image_url)}
                alt="About Regenerix"
                loading="lazy"
                className="max-h-[520px] w-full rounded-2xl object-cover"
                onError={(event) => {
                  console.error('About image failed to load:', event.currentTarget.src)
                }}
              />
            )}
            <div>
              <p className="pill mb-4">About Us</p>
              <TextReveal
                text={about.title || ''}
                className="text-3xl text-teal md:text-5xl"
              />
              <p className="mt-5 max-w-lg text-sm text-ink/70">{about.body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <Link to="/about" className="btn">
                  Read More
                </Link>
                <a href={`tel:+${SITE.tel}`} className="font-semibold">
                  {SITE.phone}
                </a>
              </div>
            </div>
          </div>
        </Sec>
      )}

      <ServicePanel title="Advanced Care, Personalised for You" />
      <Why />
      <Stats />

      {t && (
        <Sec>
          <Heading
            kicker="Our Testimonials"
            title="What Clients Say About Their Growth Journey"
          />

          <div
            key={i}
            className="a-in rounded-2xl bg-mist p-8 md:p-12"
          >
            {/* Display the testimonial image independently, when available. */}
            {t.image && (
              <img
                src={mediaUrl(t.image)}
                alt={t.name ? `${t.name} testimonial` : 'Regenerix testimonial'}
                loading="lazy"
                className="mb-6 max-h-[360px] w-full rounded-2xl object-cover"
                onError={(event) => {
                  console.error(
                    'Testimonial image failed to load:',
                    event.currentTarget.src
                  )
                }}
              />
            )}

            {/* Display the video as well, when a video URL is available. */}
            {t.video && (
              <Video
                src={t.video}
                poster={t.image || undefined}
                className="mb-6 max-h-[360px]"
              />
            )}

            <blockquote className="text-2xl md:text-3xl">
              “{t.quote}”
            </blockquote>

            <p className="mt-4 font-semibold">
              {t.name}
              <span className="font-normal text-ink/60"> · {t.role}</span>
            </p>

            <div className="mt-6 flex gap-2">
              {TESTIMONIALS.map((item, index) => (
                <button
                  key={`${item.name || 'testimonial'}-${index}`}
                  type="button"
                  aria-label={`Testimonial ${index + 1}`}
                  aria-pressed={index === i}
                  onClick={() => setI(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === i ? 'w-8 bg-teal' : 'w-2.5 bg-ink/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </Sec>
      )}

      <Packages />

      {shock && (
        <section className="mx-3 rounded-2xl bg-teal py-16 text-white md:mx-8">
          <div className="wrap grid gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-white/70">{shock.subtitle}</p>
              <h2 className="text-3xl md:text-4xl">{shock.title}</h2>
              <p className="mt-4 text-white/85">{shock.body}</p>
              <ul className="mt-5 flex flex-wrap gap-3">
                {(ex.tags || []).map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-white/40 px-4 py-1.5 text-sm"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-white/90">
              <h3 className="text-xl text-white">{ex.why_title}</h3>
              <p className="mt-2">{ex.why_body}</p>

              <h3 className="mt-6 text-xl text-white">{ex.achieve_title}</h3>
              <ul className="mt-2 space-y-1">
                {(ex.achievements || []).map(([title, description]) => (
                  <li key={title}>
                    <b>{title}</b>: {description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {STEPS.length > 0 && (
        <Sec>
          <Heading kicker="How It Works" title="Your Journey at Regenerix" />
          <ol className="grid gap-6 md:grid-cols-5">
            {STEPS.map(([title, description], index) => (
              <li key={title} className="rounded-xl bg-mist p-5">
                <span className="text-sm text-teal">Step {index + 1}</span>
                <h3 className="mt-1 text-lg">{title}</h3>
                <p className="mt-2 text-sm text-ink/70">{description}</p>
              </li>
            ))}
          </ol>
        </Sec>
      )}

      <Sec>
        <Heading
          kicker="Our Experts"
          title="Meet our Doctors, You’re in Good Hands"
        />
        <TeamGrid />
      </Sec>

      <Sec>
        <div className="grid gap-8 md:grid-cols-2">
          {BLOGS[0] && <BlogCard b={BLOGS[0]} />}
          <div className="self-center">
            <Heading
              kicker="Our Blog"
              title="Check Out Latest News Update & Articles"
            />
            <Newsletter />
          </div>
        </div>
      </Sec>

      {FAQS.length > 0 && (
        <Sec>
          <Heading
            kicker="FAQs"
            title="Your Most Important Questions Answered Here"
          />
          <Accordion items={FAQS} />
        </Sec>
      )}

      <Sec id="contact">
        <BookPanel />
      </Sec>
    </>
  )
}

export default Home
