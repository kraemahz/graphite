import {useCallback, useState, useRef} from 'react';


export default function Modal(props) {
  const [text, setText] = useState(props.enteringText);

  function enterText(event) {
    event.preventDefault();
    props.setBoxText(text);
  }

  function updateText(event) {
    setText(event.target.value);
  }

  return (
    <div
      className="text_modal" style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999,
        background: 'gray',
        padding: '20px',
      }}>
      <form onSubmit={enterText}>
        <input type="text" value={text} onChange={updateText} autoFocus />
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}
