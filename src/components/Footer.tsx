function Footer() {
  return (
    <footer className="bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] py-2 px-8">
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto italic font-mono text-xs">
        <img src="/monstera.png" alt="monstera leaf" className="w-6 h-6 opacity-75"/>
        <p className="opacity-75">this has been another <a href="https://concourse.codes" className="underline font-bold" target="_blank" rel="noopener noreferrer">Concourse Codes</a> creation.</p>
      </div>
    </footer>
  )
}

export default Footer;