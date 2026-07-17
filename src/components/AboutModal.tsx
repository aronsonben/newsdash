import Modal from './Modal';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-semibold mb-4">About NewsDash</h2>
      <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
        NewsDash is an AI-supported, climate-oriented, locally-focused news dashboard built by {' '}
        <a href="https://concourse.codes" target="_blank" rel="noreferrer" className="underline">
          Concourse Codes
        </a>.
      </p>
      <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
        NewsDash uses Google Gemini to search the web and scan trusted news sources for the latest climate news.
        You can see which sources are used at the bottom of each response.
      </p>
      <p className="mt-4 mb-5 text-center italic" style={{ color: 'rgb(var(--text-secondary))' }}>
        It's like a <b>plain language RSS feed</b> for local climate news.
      </p>
      <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
        This is a personal project by
        <img
          src="/benicon.png"
          alt="Ben Head Icon"
          className="h-10 w-auto inline-block"
        />
        <a href="https://concourse.codes/about.html" target="_blank" rel="noreferrer" className="underline">
          Ben Aronson
        </a>.
        If you have any questions, feel free to {' '}
        <a href="https://concourse.codes/contact.html" target="_blank" rel="noreferrer" className="underline">
          get in touch
        </a>.
      </p>
      <p style={{ color: 'rgb(var(--text-muted))' }} className="text-sm">
        Version 1.0 · Built with React, Vite, and Tailwind CSS.
      </p>
    </Modal>
  );
}
