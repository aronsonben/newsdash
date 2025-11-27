import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@lib/apiClient';

export default function Header() {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between bg-black/80 text-[#e0e0e0]">
      <div className="font-semibold text-[#f0f0f0]">The Concourse NewsDash</div>
      <div className="flex gap-2 items-center">
        <a href="https://concourse.codes" target="_blank" rel="noreferrer" className="text-sky-400">Concourse</a>
        <span className="text-gray-500">·</span>
        <a href="https://youtube.com/@ConcourseFM" target="_blank" rel="noreferrer" className="text-sky-400">FM</a>
        <span className="text-gray-500">·</span>
        <a href="https://bsky.app/profile/concourse-codes.bsky.social" target="_blank" rel="noreferrer" className="text-sky-400">Contact</a>
      </div>
    </header>
  );
}
