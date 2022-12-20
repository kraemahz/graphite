import {useState} from 'react';


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
        width: 400,
        background: 'gray',
        padding: '20px',
      }}>
      <form onSubmit={enterText}>
        <textarea
          type="text"
          value={text}
          onChange={updateText}
          style={{width: "360px", padding: "20px"}}
          autoFocus />
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}
