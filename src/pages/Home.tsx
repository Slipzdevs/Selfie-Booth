import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Camera, Download, Images, Lock, Palette, Sparkles, Timer } from 'lucide-react'
import { Link } from 'react-router'
import { MiniStrip, PhotoArt } from '../components'

const features = [
  [Timer, 'Your pace, your pose', 'Choose 4, 6, or 8 shots and set a countdown that feels right.'],
  [Palette, 'Make it yours', 'Pick a frame, add a filter, and decorate your photos with stickers.'],
  [Download, 'Ready to keep', 'Download your finished photo strip as a high-resolution PNG.'],
  [Images, 'Your own gallery', 'Save favorite strips in this browser and revisit them anytime.'],
  [Lock, 'Private by design', 'No account needed. Photos stay in your browser unless you choose temporary phone sharing.'],
  [Sparkles, 'A little moment of fun', 'Preview your strip as you make it, then save the final look.'],
] as const

const templates = [
  ['Clean', '#ffffff', '#19191f'],
  ['Blush', '#f8dfe3', '#713b4b'],
  ['Sage', '#dce8d5', '#354b37'],
  ['Midnight', '#19191f', '#c7b8ff'],
]

const steps = [
  ['01', 'Choose your look', 'Pick a frame, filter, and sticker before you start.'],
  ['02', 'Capture the moment', 'Set your timer and take a few photos at your own pace.'],
  ['03', 'Save your strip', 'Place stickers, preview, then download or save to your gallery.'],
]

export default function Home() {
  const reducedMotion = useReducedMotion()
  const fade = (delay = 0) => reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay, duration: 0.55 },
      }

  return (
    <>
      <section className="relative isolate grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-[#f1e8d6] px-6 py-12 sm:px-10 md:grid-cols-[1.05fr_.95fr] md:px-14 md:py-16">
        <div className="pointer-events-none absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-coral/15 blur-3xl" />
        <motion.div {...fade()}>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm shadow-sm">
            <Sparkles size={15} className="text-coral" aria-hidden /> Your camera, your photo booth
          </span>
          <h1 className="mt-6 max-w-2xl text-6xl font-bold leading-[.96] tracking-tight sm:text-7xl lg:text-8xl">
            Little moments, <em className="text-coral">made</em> memorable.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
            Turn your camera into a playful photo booth. Choose your style first, take a few photos, and make a strip that feels like you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/studio" className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3.5 font-semibold text-white shadow-lg shadow-coral/25 transition hover:-translate-y-0.5">
              Choose your style <ArrowRight size={18} aria-hidden />
            </Link>
            <Link to="/booth" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/75 px-6 py-3.5 font-semibold transition hover:bg-white">
              <Camera size={18} aria-hidden /> Start taking photos
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/65">
            <span className="inline-flex items-center gap-1.5"><Lock size={14} aria-hidden /> Photos stay local unless you share</span>
            <span>No account needed</span>
            <span>Free to use</span>
          </div>
        </motion.div>

        <motion.div {...fade(0.12)} className="relative mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between text-paper">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-paper/60">Your photo moment</p>
                <p className="mt-1 font-display text-2xl">A little joy, on repeat.</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-coral"><Camera size={18} aria-hidden /></span>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <PhotoArt i={i} />
                  <span className="absolute bottom-2 right-2 text-lg" aria-hidden>{['✨', '💖', '⭐', '🌸'][i]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-paper/75">
              <span>4 photos · blush frame</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Just for you</span>
            </div>
          </div>
          <div className="absolute -bottom-7 -left-5 w-28 -rotate-6 sm:-left-10 sm:w-32">
            <MiniStrip frame="#f8dfe3" text="#713b4b" caption="Sweet days" small />
          </div>
          <div className="absolute -right-3 -top-7 rounded-2xl bg-white px-4 py-3 shadow-xl sm:-right-7">
            <span className="flex items-center gap-2 text-sm font-semibold"><span className="text-coral">●</span> Your style, first</span>
          </div>
        </motion.div>
      </section>

      <section className="py-16 md:py-20">
        <motion.div {...fade()} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-coral">Three easy steps</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">From camera to keepsake.</h2>
        </motion.div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map(([number, title, description], i) => (
            <motion.div key={number} {...fade(i * 0.08)} className="rounded-3xl border border-ink/5 bg-white/75 p-6 shadow-sm">
              <span className="font-display text-4xl text-coral/70">{number}</span>
              <h3 className="mt-3 text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink/65">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="styles" className="scroll-mt-24 rounded-[2.5rem] bg-white/55 px-5 py-12 sm:px-8 md:py-16">
        <motion.div {...fade()} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.2em] text-coral">Find your favorite</p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">A frame for every feeling.</h2>
          </div>
          <Link to="/studio" className="inline-flex items-center gap-2 font-semibold hover:text-coral">
            Explore all styles <ArrowRight size={17} aria-hidden />
          </Link>
        </motion.div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {templates.map(([name, frame, text], i) => (
            <motion.div key={name} {...fade(i * 0.07)}>
              <Link to="/studio" className="block transition hover:-translate-y-2">
                <MiniStrip frame={frame} text={text} caption={name} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20">
        <motion.h2 {...fade()} className="text-center text-4xl font-bold tracking-tight md:text-5xl">Made for the moments in between.</motion.h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, title, text], i) => (
            <motion.div key={title} {...fade(i * 0.05)} className="rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-sm backdrop-blur">
              <span className="grid size-11 place-items-center rounded-2xl bg-lavender/50"><Icon size={20} aria-hidden /></span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 leading-relaxed text-ink/65">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="my-4 overflow-hidden rounded-[2.5rem] bg-ink px-6 py-12 text-center text-paper md:px-16 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-lavender">Your next favorite photo</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-4xl font-bold md:text-6xl">Ready when you are.</h2>
        <p className="mx-auto mt-4 max-w-lg text-paper/65">Choose your look first, then let the countdown do the rest.</p>
        <Link to="/studio" className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-7 py-4 font-semibold text-white transition hover:-translate-y-0.5">
          Choose your style <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </>
  )
}
