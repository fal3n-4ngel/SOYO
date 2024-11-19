import React from 'react'

function loading() {
  return (
    <div className="flex justify-center items-center h-screen bg-[#fdfdfd]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
    </div>
  )
}

export default loading