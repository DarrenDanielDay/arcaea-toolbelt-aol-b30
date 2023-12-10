import "./style.css";

export const Button = (props: JSX.IntrinsicElements["button"]) => (
  <button class="fancy" {...props}>
    {props.children}
  </button>
);
